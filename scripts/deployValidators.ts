import fs from "fs";
import path from "path";
import {DeployHelper} from "../helpers/DeployHelper";
import dotenv from "dotenv";

const pathOutputJson = path.join(__dirname, "./deploy_validator_output.json");

async function main() {
  dotenv.config();
  
  const stateAddress = process.env.STATE_ADDRESS;
  const validators = [
    {
      verifierContractWrapperName: "VerifierMTPWrapper",
      validatorContractName: "CredentialAtomicQueryMTPValidator",
    },
    {
      verifierContractWrapperName: "VerifierSigWrapper",
      validatorContractName: "CredentialAtomicQuerySigValidator",
    },
    {
      verifierContractWrapperName: "VerifierV3Wrapper",
      validatorContractName: "CredentialAtomicQueryV3Validator",
    },
  ];
  const deployHelper = await DeployHelper.initialize(null, true);

  const deployInfo: any = [];
  for (const v of validators) {
    const { validator, verifierWrapper } = await deployHelper.deployValidatorContracts(
      v.verifierContractWrapperName,
      v.validatorContractName,
      stateAddress
    );
    deployInfo.push({ ...v, validator: validator.address, verifier: verifierWrapper.address });
  }
  const outputJson = {
    info: deployInfo,
    network: process.env.HARDHAT_NETWORK,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
