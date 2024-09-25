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
