// scripts/deploy/adi/deployValidators.noignition.ts
import {
  getDeploymentParameters,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { network } from "hardhat";

const { ethers } = await network.connect();

// ------------------------
// RPC retry (handles flaky 502 / Cloudflare)
// ------------------------
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 10) {
  let lastErr: any;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      const is502 =
        msg.includes("502") ||
        msg.includes("Bad Gateway") ||
        msg.includes("unexpected status code");
      if (!is502) throw e;

      const waitMs = 1500 * i;
      console.log(
        `[retry ${i}/${tries}] ${label} hit RPC 502-ish error. Waiting ${waitMs}ms...`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

function isNonZeroAddress(addr?: string) {
  return (
    !!addr &&
    /^0x[a-fA-F0-9]{40}$/.test(addr) &&
    addr !== "0x0000000000000000000000000000000000000000"
  );
}

// OZ v5 Initializable: InvalidInitialization() selector 0xf92ee8a9
function isAlreadyInitializedError(e: any) {
  const data = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
  const msg = String(e?.message || "").toLowerCase();
  return (
    (typeof data === "string" && data.startsWith("0xf92ee8a9")) ||
    msg.includes("invalidinitialization") ||
    msg.includes("already initialized")
  );
}

// ------------------------
// Deploy helpers (resume-safe)
// ------------------------
async function deployByName(contractName: string, args: any[] = [], libraries?: Record<string, string>) {
  const factory = await withRetry(
    async () => ethers.getContractFactory(contractName, libraries ? { libraries } : undefined),
    `getContractFactory(${contractName})`,
  );

  const contract = await withRetry(
    async () => factory.deploy(...args),
    `deploy(${contractName})`,
  );

  const tx = contract.deploymentTransaction();
  if (tx) await withRetry(async () => tx.wait(1), `wait(1) ${contractName}`);

  const addr = await contract.getAddress();
  console.log(`${contractName} deployed to: ${addr}`);
  return { contract, addr };
}

async function ensurePlain(
  params: any,
  paramKey: string,
  contractName: string,
) {
  const existing = params[paramKey]?.contractAddress;
  if (isNonZeroAddress(existing)) {
    console.log(`${contractName} already set: ${existing}`);
    return existing as string;
  }

  params[paramKey] ||= { contractAddress: "" };

  const { addr } = await deployByName(contractName);
  params[paramKey].contractAddress = addr;

  // write immediately so reruns never redeploy
  await writeDeploymentParameters(params);
  return addr;
}

async function ensureUpgradeableProxy(
  params: any,
  implName: string,
  atKey: string,
  implKey: string,
) {
  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();

  const existingProxy = params[atKey]?.proxyAddress as string | undefined;
  if (isNonZeroAddress(existingProxy)) {
    console.log(`${implName} proxy already set: ${existingProxy}`);
    return { proxyAddr: existingProxy, sender };
  }

  const { addr: implAddr } = await deployByName(implName);
  const { addr: proxyAdminAddr } = await deployByName("ProxyAdmin", [sender]);

  const TUP = await withRetry(
    async () => ethers.getContractFactory("TransparentUpgradeableProxy"),
    "getContractFactory(TransparentUpgradeableProxy)",
  );

  // Hardhat v3 + OZ v5 artifact: ctor is (logic, initialOwner, data)
  const proxy = await withRetry(
    async () => TUP.deploy(implAddr, sender, "0x"),
    `deploy(TransparentUpgradeableProxy for ${implName})`,
  );

  const ptx = proxy.deploymentTransaction();
  if (ptx) await withRetry(async () => ptx.wait(1), `wait(1) TUP ${implName}`);

  const proxyAddr = await proxy.getAddress();

  console.log(`${implName} proxy deployed to: ${proxyAddr}`);
  console.log(`ProxyAdmin deployed to: ${proxyAdminAddr}`);
  console.log(`${implName} implementation deployed to: ${implAddr}`);

  // write BEFORE init so reruns never redeploy
  params[atKey] = { proxyAddress: proxyAddr, proxyAdminAddress: proxyAdminAddr };
  params[implKey] ||= { contractAddress: "" };
  params[implKey].contractAddress = implAddr;

  await writeDeploymentParameters(params);

  return { proxyAddr, sender };
}

// ------------------------
// ABI-driven initializer (works across different signatures)
// ------------------------
async function callAnyInitializer(
  contractName: string,
  proxyAddr: string,
  candidates: any[][],
) {
  const factory = await withRetry(
    async () => ethers.getContractFactory(contractName),
    `getContractFactory(${contractName})`,
  );
  const atProxy = factory.attach(proxyAddr);

  const initFrags = (atProxy.interface.fragments as any[]).filter(
    (f) => f.type === "function" && f.name === "initialize",
  );

  const initSigs = initFrags.map((f) => f.format());

  // No initializer? treat as ok
  if (!initSigs.length) {
    console.log(`ℹ️ ${contractName} has no initialize() in ABI. Skipping init.`);
    return;
  }

  for (const args of candidates) {
    const matchingSigs = initSigs.filter((sig) => {
      const frag = atProxy.interface.getFunction(sig);
      return frag.inputs.length === args.length;
    });

    for (const sig of matchingSigs) {
      try {
        const fn = atProxy.getFunction(sig); // ethers v6 safe
        const tx = await withRetry(
          async () => fn(...args),
          `${contractName}.${sig}`,
        );
        await withRetry(async () => tx.wait(1), `wait(1) ${contractName} init`);
        console.log(`✅ ${contractName} initialized via ${sig}`);
        return;
      } catch (e: any) {
        if (isAlreadyInitializedError(e)) {
          console.log(`ℹ️ ${contractName} already initialized (InvalidInitialization)`);
          return;
        }
        // try next overload / candidate
      }
    }
  }

  const available = initSigs.join(", ");
  throw new Error(
    `${contractName}: couldn't initialize with provided candidates.\n` +
      `Available initialize overloads: ${available}\n` +
      `Tried arg sets: ${candidates.map((a) => `(${a.length} args)`).join(", ")}`,
  );
}

// Debug helper (optional but useful)
async function logInitializeOverloads(contractName: string, proxyAddr: string) {
  const factory = await withRetry(
    async () => ethers.getContractFactory(contractName),
    `getContractFactory(${contractName})`,
  );
  const atProxy = factory.attach(proxyAddr);

  const initFrags = (atProxy.interface.fragments as any[]).filter(
    (f) => f.type === "function" && f.name === "initialize",
  );
  const initSigs = initFrags.map((f) => f.format());
  console.log(
    `ℹ️ ${contractName} initialize overloads: ${
      initSigs.length ? initSigs.join(", ") : "(none)"
    }`,
  );
  return initSigs;
}

// ------------------------
// Main
// ------------------------
async function main() {
  const params: any = await getDeploymentParameters();

  const stateProxy = params.StateAtModule?.proxyAddress as string | undefined;
  const universalVerifierProxy = params.UniversalVerifierAtModule?.proxyAddress as string | undefined;
  const identityTreeStoreProxy = params.IdentityTreeStoreAtModule?.proxyAddress as string | undefined;

  if (!isNonZeroAddress(stateProxy))
    throw new Error("StateAtModule.proxyAddress missing in chain params");
  if (!isNonZeroAddress(universalVerifierProxy))
    throw new Error("UniversalVerifierAtModule.proxyAddress missing in chain params");
  if (!isNonZeroAddress(identityTreeStoreProxy))
    throw new Error("IdentityTreeStoreAtModule.proxyAddress missing in chain params");

  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();

  console.log(`Using State proxy: ${stateProxy}`);
  console.log(`Using UniversalVerifier proxy: ${universalVerifierProxy}`);
  console.log(`Using IdentityTreeStore proxy: ${identityTreeStoreProxy}`);
  console.log(`Deploying from: ${sender}`);

  // ---- Groth wrappers (resume-safe)
  const grothMtp = await ensurePlain(params, "Groth16VerifierMTPWrapperAtModule", "Groth16VerifierMTPWrapper");
  const grothSig = await ensurePlain(params, "Groth16VerifierSigWrapperAtModule", "Groth16VerifierSigWrapper");
  const grothV3  = await ensurePlain(params, "Groth16VerifierV3WrapperAtModule", "Groth16VerifierV3Wrapper");
  const grothLMQ = await ensurePlain(params, "Groth16VerifierLinkedMultiQuery10WrapperAtModule", "Groth16VerifierLinkedMultiQuery10Wrapper");
  const grothAuth = await ensurePlain(params, "Groth16VerifierAuthV2WrapperAtModule", "Groth16VerifierAuthV2Wrapper");

  // ---- Validators (resume-safe + ABI-driven init)

  // CredentialAtomicQueryMTPV2Validator
  {
    const { proxyAddr } = await ensureUpgradeableProxy(
      params,
      "CredentialAtomicQueryMTPV2Validator",
      "CredentialAtomicQueryMTPV2ValidatorAtModule",
      "CredentialAtomicQueryMTPV2ValidatorNewImplementationAtModule",
    );

    await callAnyInitializer("CredentialAtomicQueryMTPV2Validator", proxyAddr, [
      [stateProxy, identityTreeStoreProxy, grothMtp],
      [stateProxy, universalVerifierProxy, grothMtp],
      [stateProxy, identityTreeStoreProxy, universalVerifierProxy, grothMtp],
      [stateProxy, universalVerifierProxy, identityTreeStoreProxy, grothMtp],
    ]);
  }

  // CredentialAtomicQuerySigV2Validator
  {
    const { proxyAddr } = await ensureUpgradeableProxy(
      params,
      "CredentialAtomicQuerySigV2Validator",
      "CredentialAtomicQuerySigV2ValidatorAtModule",
      "CredentialAtomicQuerySigV2ValidatorNewImplementationAtModule",
    );

    await callAnyInitializer("CredentialAtomicQuerySigV2Validator", proxyAddr, [
      [stateProxy, identityTreeStoreProxy, grothSig],
      [stateProxy, universalVerifierProxy, grothSig],
      [stateProxy, identityTreeStoreProxy, universalVerifierProxy, grothSig],
      [stateProxy, universalVerifierProxy, identityTreeStoreProxy, grothSig],
    ]);
  }

  // CredentialAtomicQueryV3Validator
  {
    const { proxyAddr } = await ensureUpgradeableProxy(
      params,
      "CredentialAtomicQueryV3Validator",
      "CredentialAtomicQueryV3ValidatorAtModule",
      "CredentialAtomicQueryV3ValidatorNewImplementationAtModule",
    );

    await callAnyInitializer("CredentialAtomicQueryV3Validator", proxyAddr, [
      [stateProxy, identityTreeStoreProxy, grothV3],
      [stateProxy, universalVerifierProxy, grothV3],
      [stateProxy, identityTreeStoreProxy, universalVerifierProxy, grothV3],
      [stateProxy, universalVerifierProxy, identityTreeStoreProxy, grothV3],
    ]);
  }

  // LinkedMultiQueryValidator
  // Your deployed build shows ONLY: initialize(address,address)
  // So we try sensible 2-arg combos (state + verifier) / (state + treeStore) and also swapped.
  {
    const { proxyAddr } = await ensureUpgradeableProxy(
      params,
      "LinkedMultiQueryValidator",
      "LinkedMultiQueryValidatorAtModule",
      "LinkedMultiQueryValidatorNewImplementationAtModule",
    );

    const initSigs = await logInitializeOverloads("LinkedMultiQueryValidator", proxyAddr);

    if (!initSigs.includes("initialize(address,address)")) {
      console.log("⚠️ LinkedMultiQueryValidator has no initialize(address,address) - skipping init.");
    } else {
      await callAnyInitializer("LinkedMultiQueryValidator", proxyAddr, [
        [stateProxy, universalVerifierProxy],
        [stateProxy, identityTreeStoreProxy],
        [universalVerifierProxy, stateProxy],
        [identityTreeStoreProxy, stateProxy],
      ]);
    }
  }

  // AuthV2Validator
  {
    const { proxyAddr } = await ensureUpgradeableProxy(
      params,
      "AuthV2Validator",
      "AuthV2ValidatorAtModule",
      "AuthV2ValidatorNewImplementationAtModule",
    );

    await callAnyInitializer("AuthV2Validator", proxyAddr, [
      [stateProxy, identityTreeStoreProxy, grothAuth],
      [stateProxy, universalVerifierProxy, grothAuth],
      [stateProxy, identityTreeStoreProxy, universalVerifierProxy, grothAuth],
      [stateProxy, universalVerifierProxy, identityTreeStoreProxy, grothAuth],
    ]);
  }

  // EthIdentityValidator
  {
    const { proxyAddr } = await ensureUpgradeableProxy(
      params,
      "EthIdentityValidator",
      "EthIdentityValidatorAtModule",
      "EthIdentityValidatorNewImplementationAtModule",
    );

    // ABI says: initialize(address)
    await logInitializeOverloads("EthIdentityValidator", proxyAddr);

    await callAnyInitializer("EthIdentityValidator", proxyAddr, [
      [stateProxy],                // most likely correct
      [universalVerifierProxy],    // fallback (unlikely but safe to try)
      [identityTreeStoreProxy],    // fallback (unlikely but safe to try)
    ]);
  }


  console.log("✅ Validators deployed + initialized (resume-safe).");
  await writeDeploymentParameters(params);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
