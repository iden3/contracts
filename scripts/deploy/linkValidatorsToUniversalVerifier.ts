import { ethers, ignition } from "hardhat";
import { getChainId, getConfig, getDeploymentParameters } from "../../helpers/helperUtils";
import CredentialAtomicQueryMTPV2ValidatorModule, {
  CredentialAtomicQueryMTPV2ValidatorProxyModule,
} from "../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../helpers/constants";
import CredentialAtomicQuerySigV2ValidatorModule, {
  CredentialAtomicQuerySigV2ValidatorProxyModule,
} from "../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule, {
  CredentialAtomicQueryV3ValidatorProxyModule,
} from "../../ignition/modules/credentialAtomicQueryV3Validator";
import AuthV2ValidatorModule, {
  AuthV2ValidatorProxyModule,
} from "../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule, {
  EthIdentityValidatorProxyModule,
} from "../../ignition/modules/ethIdentityValidator";
import LinkedMultiQueryValidatorModule, {
  LinkedMultiQueryValidatorProxyModule,
} from "../../ignition/modules/linkedMultiQuery";
import {
  AuthV2ValidatorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  LinkedMultiQueryValidatorAtModule,
  UniversalVerifierAtModule,
  UniversalVerifierTestWrapperAtModule_ManyResponsesPerUserAndRequest,
} from "../../ignition/modules/contractsAt";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  //TODO put proxyAddress and proxyAdminAddress values if using testWrapper option
  const universalVerifierOrTestWrapper: "universalVerifier" | "testWrapper" = "universalVerifier";
  const proxyAddress = "<put address of universal verifier test wrapper>";
  const proxyAdminAddress = "<put address of universal verifier test address proxy admin>";

  const [signer] = await ethers.getSigners();

  const requestValidators = [
    {
      moduleFirstImplementation: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQueryMTPV2ValidatorModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_MTP.name,
    },
    {
      moduleFirstImplementation: CredentialAtomicQuerySigV2ValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_SIG.name,
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3ValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3.name,
    },
    {
      moduleFirstImplementation: LinkedMultiQueryValidatorProxyModule,
      moduleFinalImplementation: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
    },
  ];

  const authValidators = [
    {
      authMethod: "authV2",
      moduleFirstImplementation: AuthV2ValidatorProxyModule,
      moduleFinalImplementation: AuthV2ValidatorModule,
      moduleAt: AuthV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
    },
    {
      authMethod: "ethIdentity",
      moduleFirstImplementation: EthIdentityValidatorProxyModule,
      moduleFinalImplementation: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
  ];

  let parameters = await getDeploymentParameters();
  let universalVerifier;

  if (universalVerifierOrTestWrapper === "universalVerifier") {
    const deploymentId = parameters.DeploymentId || undefined;
    universalVerifier = (
      await ignition.deploy(UniversalVerifierAtModule, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
        deploymentId: deploymentId,
      })
    ).proxy;
    console.log(`Using Universal Verifier at: ${universalVerifier.target}`);
  } else {
    parameters = Object.assign(parameters, {
      UniversalVerifierTestWrapperAtModule_ManyResponsesPerUserAndRequest: {
        proxyAddress: proxyAddress,
        proxyAdminAddress: proxyAdminAddress,
      },
    });
    const deploymentId = `chain-${await getChainId()}-many-responses-per-user-and-request`;
    universalVerifier = (
      await ignition.deploy(UniversalVerifierTestWrapperAtModule_ManyResponsesPerUserAndRequest, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
        deploymentId: deploymentId,
      })
    ).proxy;
    console.log(`Using Universal Verifier Test Wrapper at: ${universalVerifier.target}`);
  }

  for (const validator of requestValidators) {
    const validatorDeployed = await ignition.deploy(validator.moduleAt, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    if (!(await universalVerifier.isWhitelistedValidator(validatorDeployed.proxy.target))) {
      const tx = await universalVerifier.addValidatorToWhitelist(validatorDeployed.proxy.target);
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} added to whitelisted validators`,
      );
      await tx.wait();
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
      const tx = await universalVerifier.setAuthMethod({
        authMethod: validator.authMethod,
        validator: validatorDeployed.proxy.target,
        params: "0x",
      });
      await tx.wait();
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} with authMethod ${validator.authMethod} added to auth methods`,
      );
    } else {
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} with authMethod ${validator.authMethod} already added to auth methods`,
      );
    }
  }

  if (!(await universalVerifier.authMethodExists("noAuth"))) {
    const tx = await universalVerifier.setAuthMethod({
      authMethod: "noAuth",
      validator: ethers.ZeroAddress,
      params: "0x",
    });
    await tx.wait();
    console.log(`noAuth added to auth methods`);
  } else {
    console.log(`noAuth already added to auth methods`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
