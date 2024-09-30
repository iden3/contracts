import { ContractTransactionResponse } from "ethers";
import hre, { network } from "hardhat";

export function getConfig() {
  return {
    deployStrategy: process.env.DEPLOY_STRATEGY || "",
    ledgerAccount: process.env.LEDGER_ACCOUNT || "",
    stateContractAddress: process.env.STATE_CONTRACT_ADDRESS || "",
    universalVerifierContractAddress: process.env.UNIVERSAL_VERIFIER_CONTRACT_ADDRESS || "",
    validatorSigContractAddress: process.env.VALIDATOR_SIG_CONTRACT_ADDRESS || "",
    validatorMTPContractAddress: process.env.VALIDATOR_MTP_CONTRACT_ADDRESS || "",
    validatorV3ContractAddress: process.env.VALIDATOR_V3_CONTRACT_ADDRESS || "",
    poseidon2ContractAddress: process.env.POSEIDON_2_CONTRACT_ADDRESS || "",
    poseidon3ContractAddress: process.env.POSEIDON_3_CONTRACT_ADDRESS || "",
  };
}

export async function waitNotToInterfereWithHardhatIgnition(
  tx: ContractTransactionResponse,
): Promise<void> {
  const confirmationsNeeded = hre.config.ignition?.requiredConfirmations ?? 1;
  const waitConfirmations = ["localhost", "hardhat"].includes(network.name)
    ? 1
    : confirmationsNeeded;
  console.log(
    `Waiting for ${waitConfirmations} confirmations to not interfere with Hardhat Ignition`,
  );
  await tx.wait(waitConfirmations);
}
