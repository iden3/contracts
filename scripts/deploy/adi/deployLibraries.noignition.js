import {
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { network } from "hardhat";

const { ethers } = await network.connect();

// Retry helper for flaky RPC 502s
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 8) {
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
  return !!addr && /^0x[a-fA-F0-9]{40}$/.test(addr) && addr !== "0x0000000000000000000000000000000000000000";
}

async function deployByName(
  contractName: string,
  libraries?: Record<string, string>,
) {
  const factory = await withRetry(
    async () => ethers.getContractFactory(contractName, { libraries }),
    `getContractFactory(${contractName})`,
  );

  const contract = await withRetry(
    async () => factory.deploy(),
    `deploy(${contractName})`,
  );

  const tx = contract.deploymentTransaction();
  if (tx) {
    await withRetry(async () => tx.wait(1), `wait(1) ${contractName}`);
  }

  const addr = await contract.getAddress();
  return { contract, addr };
}

async function main() {
  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();

  const parameters = await getDeploymentParameters();

  // Ensure placeholders exist
  parameters.Poseidon1AtModule ||= { contractAddress: "" };
  parameters.Poseidon2AtModule ||= { contractAddress: "" };
  parameters.Poseidon3AtModule ||= { contractAddress: "" };
  parameters.Poseidon4AtModule ||= { contractAddress: "" };
  parameters.SmtLibAtModule ||= { contractAddress: "" };

  console.log(`Deploying from: ${sender}`);

  // --- Poseidon 1 ---
  if (!isNonZeroAddress(parameters.Poseidon1AtModule.contractAddress)) {
    const { addr } = await deployByName("PoseidonUnit1L");
    parameters.Poseidon1AtModule.contractAddress = addr;
    console.log(`${contractsInfo.POSEIDON_1.name} deployed to: ${addr}`);
  } else {
    console.log(
      `${contractsInfo.POSEIDON_1.name} already set: ${parameters.Poseidon1AtModule.contractAddress}`,
    );
  }

  // --- Poseidon 2 ---
  if (!isNonZeroAddress(parameters.Poseidon2AtModule.contractAddress)) {
    const { addr } = await deployByName("PoseidonUnit2L");
    parameters.Poseidon2AtModule.contractAddress = addr;
    console.log(`${contractsInfo.POSEIDON_2.name} deployed to: ${addr}`);
  } else {
    console.log(
      `${contractsInfo.POSEIDON_2.name} already set: ${parameters.Poseidon2AtModule.contractAddress}`,
    );
  }

  // --- Poseidon 3 ---
  if (!isNonZeroAddress(parameters.Poseidon3AtModule.contractAddress)) {
    const { addr } = await deployByName("PoseidonUnit3L");
    parameters.Poseidon3AtModule.contractAddress = addr;
    console.log(`${contractsInfo.POSEIDON_3.name} deployed to: ${addr}`);
  } else {
    console.log(
      `${contractsInfo.POSEIDON_3.name} already set: ${parameters.Poseidon3AtModule.contractAddress}`,
    );
  }

  // --- Poseidon 4 ---
  if (!isNonZeroAddress(parameters.Poseidon4AtModule.contractAddress)) {
    const { addr } = await deployByName("PoseidonUnit4L");
    parameters.Poseidon4AtModule.contractAddress = addr;
    console.log(`${contractsInfo.POSEIDON_4.name} deployed to: ${addr}`);
  } else {
    console.log(
      `${contractsInfo.POSEIDON_4.name} already set: ${parameters.Poseidon4AtModule.contractAddress}`,
    );
  }

  // --- SmtLib (requires linking PoseidonUnit2L + PoseidonUnit3L) ---
  if (!isNonZeroAddress(parameters.SmtLibAtModule.contractAddress)) {
    const p2 = parameters.Poseidon2AtModule.contractAddress;
    const p3 = parameters.Poseidon3AtModule.contractAddress;

    if (!isNonZeroAddress(p2) || !isNonZeroAddress(p3)) {
      throw new Error(
        `Cannot deploy SmtLib: missing Poseidon links. Poseidon2=${p2} Poseidon3=${p3}`,
      );
    }

    const { addr } = await deployByName("SmtLib", {
      PoseidonUnit2L: p2,
      PoseidonUnit3L: p3,
    });

    parameters.SmtLibAtModule.contractAddress = addr;
    console.log(`${contractsInfo.SMT_LIB.name} deployed to: ${addr}`);

    // Optional verification (keep if your verify config is set up)
    if (contractsInfo.SMT_LIB.verificationOpts) {
      const net = await ethers.provider.getNetwork();
      if (Number(net.chainId) !== 99999) {
        await verifyContract(addr, contractsInfo.SMT_LIB.verificationOpts);
      }
    }
  } else {
    console.log(
      `${contractsInfo.SMT_LIB.name} already set: ${parameters.SmtLibAtModule.contractAddress}`,
    );
  }

  await writeDeploymentParameters(parameters);
  console.log("✅ Updated chain params with deployed library addresses.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
