import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
import { deployValidatorContracts } from "../test/utils/deploy-utils";
const pathOutputJson = path.join(__dirname, "./deploy_validator_output.json");

async function main() {
  const stateAddress = "0xEA9aF2088B4a9770fC32A12fD42E61BDD317E655";
  const validators = [
    {
      verifierContractWrapperName: "VerifierMTPWrapper",
      validatorContractName: "CredentialAtomicQueryMTPValidator",
    },
    {
      verifierContractWrapperName: "VerifierSigWrapper",
      validatorContractName: "CredentialAtomicQuerySigValidator",
    },
  ];
  const deployInfo: any = [];
  for (const v of validators) {
    const { validator, verifierWrapper } = await deployValidatorContracts(
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
