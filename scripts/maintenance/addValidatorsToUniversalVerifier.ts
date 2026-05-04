import { getChainId, getConfig, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import path from "path";
import fs from "fs";
import { network } from "hardhat";

const __dirname = path.resolve();

const { ethers, networkName } = await network.connect();

async function main() {
  const [signer] = await ethers.getSigners();

  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const chainId = await getChainId();
  let universalVerifierAddr,
    validatorMTPAddr,
    validatorSigAddr,
    validatorV3Addr,
    validatorLmqAddr,
    validatorAuthV2Addr,
    validatorEthIdentityAddr;

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
      switch (v.validatorType) {
        case "mtpV2":
          validatorMTPAddr = v.validator;
          break;
        case "sigV2":
          validatorSigAddr = v.validator;
          break;
        case "v3":
          validatorV3Addr = v.validator;
          break;
        case "lmq":
          validatorLmqAddr = v.validator;
          break;
        case "authV2":
          validatorAuthV2Addr = v.validator;
          break;
        case "ethIdentity":
          validatorEthIdentityAddr = v.validator;
          break;
      }
    }
  } else {
    universalVerifierAddr = contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress;

    validatorMTPAddr = contractsInfo.VALIDATOR_MTP.unifiedAddress;
    validatorSigAddr = contractsInfo.VALIDATOR_SIG.unifiedAddress;
    validatorV3Addr = contractsInfo.VALIDATOR_V3.unifiedAddress;
    validatorLmqAddr = contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress;
    validatorAuthV2Addr = contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress;
    validatorEthIdentityAddr = contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress;
  }

  const universalVerifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    universalVerifierAddr,
  );

  console.log("Adding validators to Universal Verifier...");

  const requestValidators = [
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
      validatorContractAddress: validatorLmqAddr,
      validatorContractName: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
    },
  ];

  for (const v of requestValidators) {
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

  const authValidators = [
    {
      authMethod: "authV2",
      authValidatorAddress: validatorAuthV2Addr,
    },
    {
      authMethod: "ethIdentity",
      authValidatorAddress: validatorEthIdentityAddr,
    },
  ];

  for (const v of authValidators) {
    console.log(
      `Setting auth method ${v.authMethod}: AuthValidator address (${v.authValidatorAddress})...`,
    );
    try {
      const setAuthMethodTx = await universalVerifier.connect(signer).setAuthMethod({
        authMethod: v.authMethod,
        validator: v.authValidatorAddress,
        params: "0x",
      });
      await setAuthMethodTx.wait();
      Logger.success(
        `Auth method ${v.authMethod}: AuthValidator address (${v.authValidatorAddress}) set`,
      );
    } catch (error) {
      if (error.message.includes("AuthMethodAlreadyExists")) {
        Logger.warning(`Auth method ${v.authMethod} already set`);
      } else throw error;
    }
  }

  const authMethodEmbeddedAuth = "embeddedAuth";
  try {
    const setAuthMethodTx = await universalVerifier.connect(signer).setAuthMethod({
      authMethod: authMethodEmbeddedAuth,
      validator: ethers.ZeroAddress,
      params: "0x",
    });
    await setAuthMethodTx.wait();
    Logger.success(`Auth method ${authMethodEmbeddedAuth} set`);
  } catch (error) {
    if (error.message.includes("AuthMethodAlreadyExists")) {
      Logger.warning(`Auth method ${authMethodEmbeddedAuth} already set`);
    } else throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
