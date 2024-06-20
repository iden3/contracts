import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";

const pathOutputJson = path.join(__dirname, "./deploy_validator_output.json");

async function main() {
  // const stateAddress = "0x134B1BE34911E39A8397ec6289782989729807a4";
  const wormholeCoreContractAddress = "0x706abc4E45D419950511e474C7B9Ed348A4a716c";
  const validators = [
    {
      verifierContractWrapperName: "VerifierSigWrapper",
      validatorContractName: "CredentialAtomicQuerySigV2Validator",
    },
  ];
  const deployHelper = await DeployHelper.initialize(null, true);

  const deployInfo: any = [];
  for (const v of validators) {
    const { validator, verifierWrapper } = await deployHelper.deployValidatorContracts(
      v.verifierContractWrapperName,
      v.validatorContractName,
      wormholeCoreContractAddress
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
