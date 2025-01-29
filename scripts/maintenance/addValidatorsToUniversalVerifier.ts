import hre, { ethers } from "hardhat";
import { getChainId, getConfig, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import path from "path";
import fs from "fs";

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const chainId = await getChainId();
  const networkName = hre.network.name;
  let universalVerifierAddr,
    validatorMTPAddr,
    validatorSigAddr,
    validatorV3Addr,
    validatorAuthV2Addr;

  if (deployStrategy === "basic") {
    const uvDeployOutput = fs.readFileSync(
      path.join(
        __dirname,
        `../deployments_output/deploy_universal_verifier_output_${chainId}_${networkName}.json`,
      ),
    );
    ({ universalVerifier: universalVerifierAddr } = JSON.parse(uvDeployOutput.toString()));

    const validatorsDeployOutput = fs.readFileSync(
      path.join(
        __dirname,
        `../deployments_output/deploy_validators_output_${chainId}_${networkName}.json`,
      ),
    );
    const { validatorsInfo } = JSON.parse(validatorsDeployOutput.toString());
    for (const v of validatorsInfo) {
      if (v.validatorType === "mtpV2") {
        validatorMTPAddr = v.validator;
      } else if (v.validatorType === "sigV2") {
        validatorSigAddr = v.validator;
      } else if (v.validatorType === "v3") {
        validatorV3Addr = v.validator;
      } else if (v.validatorType === "authV2") {
        validatorAuthV2Addr = v.validator;
      }
    }
  } else {
    universalVerifierAddr = contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress;

    validatorMTPAddr = contractsInfo.VALIDATOR_MTP.unifiedAddress;
    validatorSigAddr = contractsInfo.VALIDATOR_SIG.unifiedAddress;
    validatorV3Addr = contractsInfo.VALIDATOR_V3.unifiedAddress;
    validatorAuthV2Addr = contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress;
  }

  const universalVerifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    universalVerifierAddr,
  );

  console.log("Adding validators to Universal Verifier...");

  const validators = [
    {
      validatorContractAddress: validatorMTPAddr,
      validatorContractName: contractsInfo.VALIDATOR_MTP.name,
    },
    {
      validatorContractAddress: validatorSigAddr,
      validatorContractName: contractsInfo.VALIDATOR_SIG.name,
    },
    {
      validatorContractAddress: validatorV3Addr,
      validatorContractName: contractsInfo.VALIDATOR_V3.name,
    },
    {
      validatorContractAddress: validatorAuthV2Addr,
      validatorContractName: contractsInfo.VALIDATOR_AUTH_V2.name,
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
