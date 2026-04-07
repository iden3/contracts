import {
  getDeploymentParameters,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { network } from "hardhat";

const { ethers } = await network.connect();

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
      console.log(`[retry ${i}/${tries}] ${label} hit RPC 502-ish error. Waiting ${waitMs}ms...`);
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

async function deployByName(
  contractName: string,
  libraries?: Record<string, string>,
  args: any[] = [],
) {
  const factory = await withRetry(
    async () => ethers.getContractFactory(contractName, { libraries }),
    `getContractFactory(${contractName})`,
  );

  const contract = await withRetry(
    async () => factory.deploy(...args),
    `deploy(${contractName})`,
  );

  const tx = contract.deploymentTransaction();
  if (tx) {
    await withRetry(async () => tx.wait(1), `wait(1) ${contractName}`);
  }

  const addr = await contract.getAddress();
  console.log(`${contractName} deployed to: ${addr}`);
  return { contract, addr };
}

async function main() {
  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();

  const parameters = await getDeploymentParameters();

  if (!parameters.StateAtModule?.proxyAddress || !isNonZeroAddress(parameters.StateAtModule.proxyAddress)) {
    throw new Error(`State proxy missing. Expected parameters.StateAtModule.proxyAddress`);
  }

  // Skip if already deployed
  if (parameters.IdentityTreeStoreAtModule?.proxyAddress && isNonZeroAddress(parameters.IdentityTreeStoreAtModule.proxyAddress)) {
    console.log(`IdentityTreeStore proxy already set: ${parameters.IdentityTreeStoreAtModule.proxyAddress}`);
    return;
  }

  // Libraries required in this repo
  
  const poseidon2Addr = parameters.Poseidon2AtModule?.contractAddress;
  const poseidon3Addr = parameters.Poseidon3AtModule?.contractAddress;

  
  if (!isNonZeroAddress(poseidon2Addr)) throw new Error(`PoseidonUnit2L missing in params`);
  if (!isNonZeroAddress(poseidon3Addr)) throw new Error(`PoseidonUnit3L missing in params`);

  console.log(`Deploying from: ${sender}`);
  console.log(`Using State proxy: ${parameters.StateAtModule.proxyAddress}`);

  // 1) Deploy IdentityTreeStore implementation (likely linked)
  // If your IdentityTreeStore uses different poseidon units, the error will tell us the exact names.
  const implLibraries: Record<string, string> = {
    PoseidonUnit2L: poseidon2Addr,
    PoseidonUnit3L: poseidon3Addr,
  };


  const { contract: impl, addr: implAddr } = await deployByName("IdentityTreeStore", implLibraries);

  // 2) ProxyAdmin (OZ v5: constructor(initialOwner))
  const { addr: proxyAdminAddr } = await deployByName("ProxyAdmin", undefined, [sender]);

  // 3) TransparentUpgradeableProxy (OZ v5: (_logic, initialOwner, _data))
  const TransparentUpgradeableProxy = await withRetry(
    async () => ethers.getContractFactory("TransparentUpgradeableProxy"),
    "getContractFactory(TransparentUpgradeableProxy)",
  );

  const proxy = await withRetry(
    async () => TransparentUpgradeableProxy.deploy(implAddr, sender, "0x"),
    "deploy(TransparentUpgradeableProxy)",
  );

  const ptx = proxy.deploymentTransaction();
  if (ptx) await withRetry(async () => ptx.wait(1), "wait(1) TransparentUpgradeableProxy");

  const proxyAddr = await proxy.getAddress();

  console.log(`IdentityTreeStore proxy deployed to: ${proxyAddr}`);
  console.log(`ProxyAdmin deployed to: ${proxyAdminAddr}`);
  console.log(`IdentityTreeStore implementation deployed to: ${implAddr}`);

  // 4) Initialize via proxy
  // Most iden3 IdentityTreeStore initializes with State address + owner/admin.
  // We will introspect and call the correct initializer at runtime.
  const identityAtProxy = impl.attach(proxyAddr);

  // Try common patterns (repo variations exist). We attempt in safe order.
  const stateAddr = parameters.StateAtModule.proxyAddress;

  const tried: string[] = [];
  const tryInit = async (fnName: string, args: any[]) => {
    tried.push(`${fnName}(${args.map(() => "arg").join(",")})`);
    const tx = await (identityAtProxy as any)[fnName](...args);
    await tx.wait(1);
    console.log(`✅ Initialized via ${fnName}`);
    return true;
  };

  try {
    // Pattern A: initialize(address state, address owner)
    if ((identityAtProxy as any).initialize) {
      try {
        await withRetry(() => tryInit("initialize", [stateAddr, sender]), "IdentityTreeStore.initialize(state,owner)");
      } catch {
        // Pattern B: initialize(address state)
        await withRetry(() => tryInit("initialize", [stateAddr]), "IdentityTreeStore.initialize(state)");
      }
    } else {
      throw new Error("No initialize() found on IdentityTreeStore");
    }
  } catch (e: any) {
    console.log("❌ Could not initialize IdentityTreeStore with common signatures.");
    console.log("Tried:", tried.join(" | "));
    throw e;
  }

  // Save params
  parameters.IdentityTreeStoreAtModule = {
    proxyAddress: proxyAddr,
    proxyAdminAddress: proxyAdminAddr,
  };

  parameters.IdentityTreeStoreNewImplementationAtModule ||= { contractAddress: "" };
  parameters.IdentityTreeStoreNewImplementationAtModule.contractAddress = implAddr;

  await writeDeploymentParameters(parameters);

  console.log(`✅ IdentityTreeStore (proxy): ${proxyAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
