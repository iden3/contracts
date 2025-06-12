import fs from "fs";
import path from "path";
import { DeployHelper, ValidatorType } from "../../helpers/DeployHelper";
import hre, { ethers, ignition } from "hardhat";
import { getConfig, getStateContractAddress, verifyContract } from "../../helpers/helperUtils";
import CredentialAtomicQueryMTPV2ValidatorModule from "../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../helpers/constants";
import CredentialAtomicQuerySigV2ValidatorModule from "../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "../../ignition/modules/credentialAtomicQueryV3Validator";
import AuthV2ValidatorModule from "../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule from "../../ignition/modules/ethIdentityValidator";
import LinkedMultiQueryValidatorModule from "../../ignition/modules/linkedMultiQuery";
import { proxy } from "../../typechain-types/@openzeppelin/contracts";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const networkName = hre.network.name;
  const paramsPath = path.join(__dirname, `../../ignition/modules/params/${networkName}.json`);
  const parameters = JSON.parse(fs.readFileSync(paramsPath).toString());

  const validatorContracts = [
    {
      module: CredentialAtomicQueryMTPV2ValidatorModule,
      name: contractsInfo.VALIDATOR_MTP.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      paramName: "CredentialAtomicQueryMTPV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      paramName: "CredentialAtomicQuerySigV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts,
    },
    {
      module: CredentialAtomicQueryV3ValidatorModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      paramName: "CredentialAtomicQueryV3ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3.verificationOpts,
    },
    {
      module: LinkedMultiQueryValidatorModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
      paramName: "LinkedMultiQueryValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      verifierVerificationOpts:
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.verificationOpts,
    },
    {
      module: AuthV2ValidatorModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      paramName: "AuthV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
    },
    {
      module: EthIdentityValidatorModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      paramName: "EthIdentityValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
  ];

  for (const validatorContract of validatorContracts) {
    const deployment = await ignition.deploy(validatorContract.module, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    parameters[validatorContract.paramName] = {
      proxyAddress: deployment[Object.keys(deployment)[0]].target,
      proxyAdminAddress: deployment.proxyAdmin.target,
    };
    if (validatorContract.verifierName) {
      console.log(
        `${validatorContract.verifierName} deployed to: ${deployment[Object.keys(deployment)[1]].target}`,
      );
    }
    console.log(
      `${validatorContract.name} deployed to: ${deployment[Object.keys(deployment)[0]].target}`,
    );

    if (validatorContract.verificationOpts) {
      await verifyContract(
        await deployment[Object.keys(deployment)[0]].getAddress(),
        validatorContract.verificationOpts,
      );
    }
    if (validatorContract.verifierVerificationOpts) {
      await verifyContract(
        await deployment[Object.keys(deployment)[1]].getAddress(),
        validatorContract.verifierVerificationOpts,
      );
    }
  }

  fs.writeFileSync(paramsPath, JSON.stringify(parameters, null, 2), {
    encoding: "utf8",
    flag: "w",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
