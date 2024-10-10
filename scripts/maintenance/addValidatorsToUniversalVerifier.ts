import hre, { ethers } from "hardhat";
import { Logger } from "../../helpers/helperUtils";
import { CONTRACT_NAMES, UNIFIED_CONTRACT_ADDRESSES } from "../../helpers/constants";

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const universalVerifier = await ethers.getContractAt(
    CONTRACT_NAMES.UNIVERSAL_VERIFIER,
    UNIFIED_CONTRACT_ADDRESSES.UNIVERSAL_VERIFIER,
  );

  console.log("Adding validators to Universal Verifier...");

  const validators = [
    {
      validatorContractAddress: UNIFIED_CONTRACT_ADDRESSES.VALIDATOR_MTP,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_MTP,
    },
    {
      validatorContractAddress: UNIFIED_CONTRACT_ADDRESSES.VALIDATOR_SIG,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_SIG,
    },
    {
      validatorContractAddress: UNIFIED_CONTRACT_ADDRESSES.VALIDATOR_V3,
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
      Logger.success(
        `Validator ${v.validatorContractName} (${v.validatorContractAddress}) whitelisted`,
      );
    } else {
      Logger.warning(
        `Validator ${v.validatorContractName} (${v.validatorContractAddress}) is already whitelisted`,
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
