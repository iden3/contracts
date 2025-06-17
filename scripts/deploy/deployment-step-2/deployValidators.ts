import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import CredentialAtomicQueryMTPV2ValidatorModule from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../../helpers/constants";
import CredentialAtomicQuerySigV2ValidatorModule from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import AuthV2ValidatorModule from "../../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule from "../../../ignition/modules/ethIdentityValidator";
import LinkedMultiQueryValidatorModule from "../../../ignition/modules/linkedMultiQuery";
import {
  AuthV2ValidatorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  LinkedMultiQueryValidatorAtModule,
  UniversalVerifierAtModule,
} from "../../../ignition/modules/contractsAt";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  const requestValidators = [
    {
      moduleFinalImplementation: CredentialAtomicQueryMTPV2ValidatorModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_MTP.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      paramName: "CredentialAtomicQueryMTPV2ValidatorAtModule",
    },
    {
      moduleFinalImplementation: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      paramName: "CredentialAtomicQuerySigV2ValidatorAtModule",
    },
    {
      moduleFinalImplementation: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      paramName: "CredentialAtomicQueryV3ValidatorAtModule",
    },
    {
      moduleFinalImplementation: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
      paramName: "LinkedMultiQueryValidatorAtModule",
    },
  ];

  const authValidators = [
    {
      authMethod: "authV2",
      moduleFinalImplementation: AuthV2ValidatorModule,
      moduleAt: AuthV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      paramName: "AuthV2ValidatorAtModule",
    },
    {
      authMethod: "ethIdentity",
      moduleFinalImplementation: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      paramName: "EthIdentityValidatorAtModule",
    },
  ];

  for (const validatorContract of [...requestValidators, ...authValidators]) {
    const deployment = await ignition.deploy(validatorContract.moduleFinalImplementation as any, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    if (validatorContract.verifierName && deployment.groth16Verifier) {
      console.log(
        `${validatorContract.verifierName} contract at: ${deployment.groth16Verifier.target}`,
      );
    }
    console.log(`${validatorContract.name} upgraded: ${deployment.proxy.target}`);
  }

  const universalVerifier = (
    await ignition.deploy(UniversalVerifierAtModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    })
  ).proxy;

  for (const validator of requestValidators) {
    const validatorDeployed = await ignition.deploy(validator.moduleAt, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    if (!(await universalVerifier.isWhitelistedValidator(validatorDeployed.proxy.target))) {
      await universalVerifier.addValidatorToWhitelist(validatorDeployed.proxy.target);
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} added to whitelisted validators`,
      );
    } else {
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} already whitelisted`,
      );
    }
  }

  for (const validator of authValidators) {
    const validatorDeployed = await ignition.deploy(validator.moduleAt, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    if (!(await universalVerifier.authMethodExists(validator.authMethod))) {
      await universalVerifier.setAuthMethod({
        authMethod: validator.authMethod,
        validator: validatorDeployed.proxy.target,
        params: "0x",
      });
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} added to auth methods`,
      );
    } else {
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} already added to auth methods`,
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
