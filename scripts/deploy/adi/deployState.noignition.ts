import {
  getDeploymentParameters,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { ethers } from "hardhat";

// Retry helper for flaky RPC 502s
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 10): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String((e as Error)?.message || e);
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
  throw lastErr as Error;
}

function isNonZeroAddress(addr?: string): boolean {
  return (
    !!addr &&
    /^0x[a-fA-F0-9]{40}$/.test(addr) &&
    addr !== "0x0000000000000000000000000000000000000000"
  );
}

// Deploy a contract by name, with optional library linking + constructor args
async function deployByName(
  contractName: string,
  libraries?: Record<string, string>,
  args: unknown[] = [],
) {
  const factory = await withRetry(
    async () => ethers.getContractFactory(contractName, { libraries }),
    `getContractFactory(${contractName})`,
  );

  const contract = await withRetry(
    async () => factory.deploy(...args),
    `deploy(${contractName})`,
  );

  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log(`${contractName} deployed to: ${addr}`);
  return { contract, addr };
}

async function main() {
  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();

  const parameters = await getDeploymentParameters();

  parameters.StateProxyFinalImplementationModule ||= { defaultIdType: "" };
  parameters.CrossChainProofValidatorModule ||= { oracleSigningAddress: sender };

  const defaultIdType: string = parameters.StateProxyFinalImplementationModule.defaultIdType || "";

  if (!defaultIdType) {
    throw new Error(
      "Missing StateProxyFinalImplementationModule.defaultIdType in deployment parameters.",
    );
  }

  if (!/^0x[a-fA-F0-9]{4}$/.test(defaultIdType)) {
    throw new Error(`defaultIdType must be bytes2 like 0x0113. Got: ${defaultIdType}`);
  }

  console.log(`Deploying from: ${sender}`);
  console.log(`defaultIdType: ${defaultIdType}`);

  if (parameters.StateAtModule?.proxyAddress && isNonZeroAddress(parameters.StateAtModule.proxyAddress)) {
    console.log(`State proxy already set: ${parameters.StateAtModule.proxyAddress}`);
    return;
  }

  const oracle = parameters.CrossChainProofValidatorModule.oracleSigningAddress;
  const domainName = "iden3";
  const signatureVersion = "1";

  const { addr: crossChainProofValidatorAddr } = await deployByName(
    "CrossChainProofValidator",
    undefined,
    [domainName, signatureVersion, oracle],
  );

  const { addr: groth16VerifierAddr } = await deployByName("Groth16VerifierStateTransition");
  const { addr: stateLibAddr } = await deployByName("StateLib");

  const smtLibAddr = parameters.SmtLibAtModule?.contractAddress;
  const poseidon1Addr = parameters.Poseidon1AtModule?.contractAddress;

  if (!isNonZeroAddress(smtLibAddr)) {
    throw new Error(`SmtLib address missing in params. Got: ${smtLibAddr}`);
  }
  if (!isNonZeroAddress(poseidon1Addr)) {
    throw new Error(`PoseidonUnit1L address missing in params. Got: ${poseidon1Addr}`);
  }

  const stateLibraries: Record<string, string> = {
    PoseidonUnit1L: poseidon1Addr,
    SmtLib: smtLibAddr,
    StateLib: stateLibAddr,
  };

  const { contract: stateImpl, addr: stateImplAddr } = await deployByName("State", stateLibraries);

  const { addr: proxyAdminAddr } = await deployByName("ProxyAdmin", undefined, [sender]);

  const TransparentUpgradeableProxy = await withRetry(
    async () => ethers.getContractFactory("TransparentUpgradeableProxy"),
    "getContractFactory(TransparentUpgradeableProxy)",
  );

  const proxy = await withRetry(
    async () => TransparentUpgradeableProxy.deploy(stateImplAddr, sender, "0x"),
    "deploy(TransparentUpgradeableProxy)",
  );
  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  console.log(`State proxy deployed to: ${proxyAddr}`);
  console.log(`ProxyAdmin deployed to: ${proxyAdminAddr}`);
  console.log(`State implementation deployed to: ${stateImplAddr}`);

  const stateAtProxy = stateImpl.attach(proxyAddr);

  console.log("Calling State.initialize(verifier, defaultIdType, owner, validator) ...");
  const initTx = await withRetry(
    async () =>
      stateAtProxy.initialize(
        groth16VerifierAddr,
        defaultIdType,
        sender,
        crossChainProofValidatorAddr,
      ),
    "State.initialize",
  );
  await initTx.wait();

  console.log("✅ State initialized");

  const deployedDefaultIdType = await stateAtProxy.getDefaultIdType();
  const deployedVerifier = await stateAtProxy.getVerifier();
  const deployedGistRoot = await stateAtProxy.getGISTRoot();

  console.log("Post-init getDefaultIdType:", deployedDefaultIdType);
  console.log("Post-init getVerifier:", deployedVerifier);
  console.log("Post-init getGISTRoot:", deployedGistRoot.toString());

  parameters.StateAtModule = {
    proxyAddress: proxyAddr,
    proxyAdminAddress: proxyAdminAddr,
  };

  parameters.CrossChainProofValidatorAtModule ||= { contractAddress: "" };
  parameters.Groth16VerifierStateTransitionAtModule ||= { contractAddress: "" };
  parameters.StateLibAtModule ||= { contractAddress: "" };
  parameters.StateNewImplementationAtModule ||= { contractAddress: "" };

  parameters.CrossChainProofValidatorAtModule.contractAddress = crossChainProofValidatorAddr;
  parameters.Groth16VerifierStateTransitionAtModule.contractAddress = groth16VerifierAddr;
  parameters.StateLibAtModule.contractAddress = stateLibAddr;
  parameters.StateNewImplementationAtModule.contractAddress = stateImplAddr;

  await writeDeploymentParameters(parameters);

  console.log(`✅ CrossChainProofValidator: ${crossChainProofValidatorAddr}`);
  console.log(`✅ Groth16VerifierStateTransition: ${groth16VerifierAddr}`);
  console.log(`✅ StateLib: ${stateLibAddr}`);
  console.log(`✅ State (proxy): ${proxyAddr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});