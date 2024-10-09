import hre, { ethers } from "hardhat";
import { getConfig, isContract } from "../../helpers/helperUtils";
import { CONTRACT_NAMES } from "../../helpers/constants";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log(signer.address);

  const config = getConfig();

  if (!(await isContract(config.universalVerifierContractAddress))) {
    throw new Error("UNIVERSAL_VERIFIER_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.validatorMTPContractAddress))) {
    throw new Error("VALIDATOR_MTP_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.validatorSigContractAddress))) {
    throw new Error("VALIDATOR_SIG_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.validatorV3ContractAddress))) {
    throw new Error("VALIDATOR_V3_CONTRACT_ADDRESS is not set or invalid");
  }

  const universalVerifier = await ethers.getContractAt(
    CONTRACT_NAMES.UNIVERSAL_VERIFIER,
    config.universalVerifierContractAddress,
  );

  console.log("Adding validators to Universal Verifier...");

  const validators = [
    {
      validatorContractAddress: config.validatorMTPContractAddress,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_MTP,
    },
    {
      validatorContractAddress: config.validatorSigContractAddress,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_SIG,
    },
    {
      validatorContractAddress: config.validatorV3ContractAddress,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_V3,
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
