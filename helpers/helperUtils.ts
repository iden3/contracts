import { ContractTransactionResponse } from "ethers";
import hre, { network } from "hardhat";
import { boolean } from "hardhat/internal/core/params/argumentTypes";

export function getConfig() {
  return {
    deployStrategy: process.env.DEPLOY_STRATEGY || "",
    ledgerAccount: process.env.LEDGER_ACCOUNT || "",
    stateContractAddress: process.env.STATE_CONTRACT_ADDRESS || "",
    universalVerifierContractAddress: process.env.UNIVERSAL_VERIFIER_CONTRACT_ADDRESS || "",
    validatorSigContractAddress: process.env.VALIDATOR_SIG_CONTRACT_ADDRESS || "",
    validatorMTPContractAddress: process.env.VALIDATOR_MTP_CONTRACT_ADDRESS || "",
    validatorV3ContractAddress: process.env.VALIDATOR_V3_CONTRACT_ADDRESS || "",
    poseidon1ContractAddress: process.env.POSEIDON_1_CONTRACT_ADDRESS || "",
    poseidon2ContractAddress: process.env.POSEIDON_2_CONTRACT_ADDRESS || "",
    poseidon3ContractAddress: process.env.POSEIDON_3_CONTRACT_ADDRESS || "",
    smtLibContractAddress: process.env.SMT_LIB_ADDRESS || "",
  };
}

export async function waitNotToInterfereWithHardhatIgnition(
  tx: ContractTransactionResponse | null | undefined,
): Promise<void> {
  const isLocalNetwork = ["localhost", "hardhat"].includes(network.name);
  const confirmationsNeeded = isLocalNetwork
    ? 1
    : (hre.config.ignition?.requiredConfirmations ?? 1);

  if (tx) {
    console.log(
      `Waiting for ${confirmationsNeeded} confirmations to not interfere with Hardhat Ignition`,
    );
    await tx.wait(confirmationsNeeded);
  } else if (isLocalNetwork) {
    console.log(
      `Mining ${confirmationsNeeded} blocks not to interfere with Hardhat Ignition`,
    );
    for (const _ of Array.from({ length: confirmationsNeeded })) {
      await hre.ethers.provider.send("evm_mine");
    }
  } else {
    const blockNumberDeployed = await hre.ethers.provider.getBlockNumber();
    let blockNumber = blockNumberDeployed;
    console.log("Waiting some blocks to expect at least 5 confirmations for Hardhat Ignition...");
    while (blockNumber < blockNumberDeployed + 10) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      blockNumber = await hre.ethers.provider.getBlockNumber();
    }
  }
}
