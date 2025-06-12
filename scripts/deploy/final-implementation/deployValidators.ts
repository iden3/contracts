import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import CredentialAtomicQueryMTPV2ValidatorModule, {
  CredentialAtomicQueryMTPV2ValidatorProxyModule,
} from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../../helpers/constants";
import CredentialAtomicQuerySigV2ValidatorModule, {
  CredentialAtomicQuerySigV2ValidatorProxyModule,
} from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule, {
  CredentialAtomicQueryV3ValidatorProxyModule,
} from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import AuthV2ValidatorModule, {
  AuthV2ValidatorProxyModule,
} from "../../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule, {
  EthIdentityValidatorProxyModule,
} from "../../../ignition/modules/ethIdentityValidator";
import LinkedMultiQueryValidatorModule, {
  LinkedMultiQueryValidatorProxyModule,
} from "../../../ignition/modules/linkedMultiQuery";
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

  const requestValidators = [
    {
      moduleFinalImplementation: CredentialAtomicQueryMTPV2ValidatorModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_MTP.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      paramName: "CredentialAtomicQueryMTPV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts,
    },
    {
      moduleFinalImplementation: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      paramName: "CredentialAtomicQuerySigV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts,
    },
    {
      moduleFinalImplementation: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      paramName: "CredentialAtomicQueryV3ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3.verificationOpts,
    },
    {
      moduleFinalImplementation: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
      paramName: "LinkedMultiQueryValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      verifierVerificationOpts:
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.verificationOpts,
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
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
    },
    {
      authMethod: "ethIdentity",
      moduleFinalImplementation: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      paramName: "EthIdentityValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
  ];

  for (const validatorContract of [...requestValidators, ...authValidators]) {
    const deployment = await ignition.deploy(validatorContract.moduleFinalImplementation as any, {
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

  const universalVerifier = (
    await ignition.deploy(UniversalVerifierAtModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    })
  ).proxy;

  for (const validator of requestValidators) {
    const validatorDeployed = await ignition.deploy(validator.moduleAt, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
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

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
