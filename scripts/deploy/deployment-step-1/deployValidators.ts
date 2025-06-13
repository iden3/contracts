import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { CredentialAtomicQueryMTPV2ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../../helpers/constants";
import { CredentialAtomicQuerySigV2ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import { CredentialAtomicQueryV3ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import { AuthV2ValidatorProxyModule } from "../../../ignition/modules/authV2Validator";
import { EthIdentityValidatorProxyModule } from "../../../ignition/modules/ethIdentityValidator";
import { LinkedMultiQueryValidatorProxyModule } from "../../../ignition/modules/linkedMultiQuery";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();

  const requestValidators = [
    {
      moduleFirstImplementation: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_MTP.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      paramName: "CredentialAtomicQueryMTPV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts,
    },
    {
      moduleFirstImplementation: CredentialAtomicQuerySigV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      paramName: "CredentialAtomicQuerySigV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts,
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      paramName: "CredentialAtomicQueryV3ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3.verificationOpts,
    },
    {
      moduleFirstImplementation: LinkedMultiQueryValidatorProxyModule,
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
      moduleFirstImplementation: AuthV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      paramName: "AuthV2ValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
    },
    {
      moduleFirstImplementation: EthIdentityValidatorProxyModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      paramName: "EthIdentityValidatorAtModule",
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
  ];

  for (const validatorContract of [...requestValidators, ...authValidators]) {
    const deployment = await ignition.deploy(validatorContract.moduleFirstImplementation as any, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    parameters[validatorContract.paramName] = {
      proxyAddress: deployment.proxy.target,
      proxyAdminAddress: deployment.proxyAdmin.target,
    };
    if (validatorContract.verifierName && deployment.groth16Verifier) {
      console.log(
        `${validatorContract.verifierName} deployed to: ${deployment.groth16Verifier.target}`,
      );
    }
    console.log(`${validatorContract.name} deployed to: ${deployment.proxy.target}`);

    if (validatorContract.verificationOpts) {
      await verifyContract(deployment.proxy.target, validatorContract.verificationOpts);
    }
    if (validatorContract.verifierVerificationOpts && deployment.groth16Verifier) {
      await verifyContract(
        deployment.groth16Verifier.target,
        validatorContract.verifierVerificationOpts,
      );
    }
    await verifyContract(deployment.newImplementation.target, {
      constructorArgsImplementation: [],
      libraries: {},
    });
  }

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
