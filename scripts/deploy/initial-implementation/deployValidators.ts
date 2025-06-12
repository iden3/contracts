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
      moduleFirstImplementation: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_MTP.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      paramName: "CredentialAtomicQueryMTPV2ValidatorAtModule",
    },
    {
      moduleFirstImplementation: CredentialAtomicQuerySigV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      paramName: "CredentialAtomicQuerySigV2ValidatorAtModule",
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      paramName: "CredentialAtomicQueryV3ValidatorAtModule",
    },
    {
      moduleFirstImplementation: LinkedMultiQueryValidatorProxyModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
      paramName: "LinkedMultiQueryValidatorAtModule",
    },
  ];

  const authValidators = [
    {
      moduleFirstImplementation: AuthV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      paramName: "AuthV2ValidatorAtModule",
    },
    {
      moduleFirstImplementation: EthIdentityValidatorProxyModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      paramName: "EthIdentityValidatorAtModule",
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
    if (validatorContract.verifierName) {
      console.log(
        `${validatorContract.verifierName} deployed to: ${deployment[Object.keys(deployment)[0]].target}`,
      );
    }
    console.log(`${validatorContract.name} deployed to: ${deployment.proxy.target}`);
  }

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
