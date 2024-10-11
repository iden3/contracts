import hre, { ethers } from "hardhat";
import { Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const universalVerifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
  );

  console.log("Adding validators to Universal Verifier...");

  const validators = [
    {
      validatorContractAddress: contractsInfo.VALIDATOR_MTP.unifiedAddress,
      validatorContractName: contractsInfo.VALIDATOR_MTP.name,
    },
    {
      validatorContractAddress: contractsInfo.VALIDATOR_SIG.unifiedAddress,
      validatorContractName: contractsInfo.VALIDATOR_SIG.name,
    },
    {
      validatorContractAddress: contractsInfo.VALIDATOR_V3.unifiedAddress,
      validatorContractName: contractsInfo.VALIDATOR_V3.name,
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
