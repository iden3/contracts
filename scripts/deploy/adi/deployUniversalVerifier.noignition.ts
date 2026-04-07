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

  // Pre-reqs
  const stateProxy = parameters.StateAtModule?.proxyAddress;
  if (!isNonZeroAddress(stateProxy)) throw new Error("State proxy missing in params");

  // Skip if already deployed
  if (
    parameters.UniversalVerifierAtModule?.proxyAddress &&
    isNonZeroAddress(parameters.UniversalVerifierAtModule.proxyAddress)
  ) {
    console.log(`UniversalVerifier proxy already set: ${parameters.UniversalVerifierAtModule.proxyAddress}`);
    return;
  }

  console.log(`Deploying from: ${sender}`);
  console.log(`Using State proxy: ${stateProxy}`);

  // UniversalVerifier in this repo usually links VerifierLib.
  // We'll deploy VerifierLib first, then link it.
  const { addr: verifierLibAddr } = await deployByName("VerifierLib");

  const verifierLibraries: Record<string, string> = {
    VerifierLib: verifierLibAddr,
  };

  // Deploy implementation
  const { contract: impl, addr: implAddr } = await deployByName("UniversalVerifier", verifierLibraries);

  // OZ v5 ProxyAdmin(initialOwner)
  const { addr: proxyAdminAddr } = await deployByName("ProxyAdmin", undefined, [sender]);

  // OZ v5 TransparentUpgradeableProxy(_logic, initialOwner, _data)
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

  console.log(`UniversalVerifier proxy deployed to: ${proxyAddr}`);
  console.log(`ProxyAdmin deployed to: ${proxyAdminAddr}`);
  console.log(`UniversalVerifier implementation deployed to: ${implAddr}`);

  // Initialize via proxy.
  // Common signature: initialize(address state, address owner) OR initialize(address state)
  const verifierAtProxy = impl.attach(proxyAddr);

  const tried: string[] = [];
  const tryInit = async (fnName: string, args: any[]) => {
    tried.push(`${fnName}(${args.length})`);
    const tx = await (verifierAtProxy as any)[fnName](...args);
    await tx.wait(1);
    console.log(`✅ Initialized via ${fnName}`);
    return true;
  };

  try {
    if ((verifierAtProxy as any).initialize) {
      try {
        await withRetry(
          () => tryInit("initialize", [stateProxy, sender]),
          "UniversalVerifier.initialize(state,owner)",
        );
      } catch {
        await withRetry(
          () => tryInit("initialize", [stateProxy]),
          "UniversalVerifier.initialize(state)",
        );
      }
    } else {
      throw new Error("No initialize() found on UniversalVerifier");
    }
  } catch (e: any) {
    console.log("❌ Could not initialize UniversalVerifier with common signatures.");
    console.log("Tried:", tried.join(" | "));
    throw e;
  }

  // Save params
  parameters.UniversalVerifierAtModule = {
    proxyAddress: proxyAddr,
    proxyAdminAddress: proxyAdminAddr,
  };

  parameters.VerifierLibAtModule ||= { contractAddress: "" };
  parameters.UniversalVerifierNewImplementationAtModule ||= { contractAddress: "" };

  parameters.VerifierLibAtModule.contractAddress = verifierLibAddr;
  parameters.UniversalVerifierNewImplementationAtModule.contractAddress = implAddr;

  await writeDeploymentParameters(parameters);

  console.log(`✅ VerifierLib: ${verifierLibAddr}`);
  console.log(`✅ UniversalVerifier (proxy): ${proxyAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
