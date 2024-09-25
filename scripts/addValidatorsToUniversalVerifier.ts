import hre, { ethers } from "hardhat";
import { getConfig } from "../helpers/config";

const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
const validatorV3ContractName = "CredentialAtomicQueryV3Validator";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log(signer.address);

  const config = getConfig();

  if (!ethers.isAddress(config.universalVerifierContractAddress)) {
    throw new Error("UNIVERSAL_VERIFIER_CONTRACT_ADDRESS is not set");
  }
  if (!ethers.isAddress(config.validatorMTPContractAddress)) {
    throw new Error("VALIDATOR_MTP_CONTRACT_ADDRESS is not set");
  }
  if (!ethers.isAddress(config.validatorSigContractAddress)) {
    throw new Error("VALIDATOR_SIG_CONTRACT_ADDRESS is not set");
  }
  if (!ethers.isAddress(config.validatorV3ContractAddress)) {
    throw new Error("VALIDATOR_V3_CONTRACT_ADDRESS is not set");
  }

  const universalVerifier = await ethers.getContractAt(
    "UniversalVerifier",
    config.universalVerifierContractAddress,
  );

  console.log("Adding validators to Universal Verifier...");

  const validators = [
    {
      validatorContractAddress: config.validatorMTPContractAddress,
      validatorContractName: validatorMTPContractName,
    },
    {
      validatorContractAddress: config.validatorSigContractAddress,
      validatorContractName: validatorSigContractName,
    },
    {
      validatorContractAddress: config.validatorV3ContractAddress,
      validatorContractName: validatorV3ContractName,
    },
  ];

  for (const v of validators) {
    const isWhitelisted = await universalVerifier.isWhitelistedValidator(
      v.validatorContractAddress,
    );
    if (!isWhitelisted) {
      console.log(
        `Adding validator ${v.validatorContractName} (${v.validatorContractAddress}) to whitelist...`,
      );
      const addToWhiteListTx = await universalVerifier
        .connect(signer)
        .addValidatorToWhitelist(v.validatorContractAddress);
      await addToWhiteListTx.wait();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
