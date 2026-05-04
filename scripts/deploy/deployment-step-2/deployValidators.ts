import { getConfig, getDeploymentParameters } from "../../../helpers/helperUtils";
import CredentialAtomicQueryMTPV2ValidatorModule from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../../helpers/constants";
import CredentialAtomicQuerySigV2ValidatorModule from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import AuthV2ValidatorModule from "../../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule from "../../../ignition/modules/ethIdentityValidator";
import LinkedMultiQueryValidatorModule from "../../../ignition/modules/linkedMultiQueryValidator";
import {
  AuthV2ValidatorAtModule,
  AuthV3ValidatorAtModule,
  AuthV3_8_32ValidatorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3StableValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  LinkedMultiQueryStableValidatorAtModule,
  LinkedMultiQueryValidatorAtModule,
} from "../../../ignition/modules/contractsAt";
import { network } from "hardhat";
import CredentialAtomicQueryV3StableValidatorModule from "../../../ignition/modules/credentialAtomicQueryV3StableValidator";
import LinkedMultiQueryStableValidatorModule from "../../../ignition/modules/linkedMultiQueryStableValidator";
import AuthV3ValidatorModule from "../../../ignition/modules/authV3Validator";
import AuthV3_8_32ValidatorModule from "../../../ignition/modules/authV3_8_32Validator";

const { ethers, ignition } = await network.connect();

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
    },
    {
      moduleFinalImplementation: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
    },
    {
      moduleFinalImplementation: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
    },
    {
      moduleFinalImplementation: CredentialAtomicQueryV3StableValidatorModule,
      moduleAt: CredentialAtomicQueryV3StableValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3_STABLE.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3_STABLE.name,
    },
    {
      moduleFinalImplementation: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name,
    },
    {
      moduleFinalImplementation: LinkedMultiQueryStableValidatorModule,
      moduleAt: LinkedMultiQueryStableValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.name,
    },    
  ];

  const authValidators = [
    {
      moduleFinalImplementation: AuthV2ValidatorModule,
      moduleAt: AuthV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
    },
    {
      moduleFinalImplementation: AuthV3ValidatorModule,
      moduleAt: AuthV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V3.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V3.name,
    },    
    {
      moduleFinalImplementation: AuthV3_8_32ValidatorModule,
      moduleAt: AuthV3_8_32ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V3_8_32.name,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name,
    },    
    {
      moduleFinalImplementation: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
