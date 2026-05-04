import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
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
} from "../../ignition/modules/linkedMultiQueryValidator";
import {
  AuthV2ValidatorAtModule,
  AuthV3_8_32ValidatorAtModule,
  AuthV3ValidatorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3StableValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  LinkedMultiQueryStableValidatorAtModule,
  LinkedMultiQueryValidatorAtModule,
} from "../../ignition/modules/contractsAt";
import { network } from "hardhat";
import CredentialAtomicQueryV3StableValidatorModule, {
  CredentialAtomicQueryV3StableValidatorProxyModule,
} from "../../ignition/modules/credentialAtomicQueryV3StableValidator";
import LinkedMultiQueryStableValidatorModule, {
  LinkedMultiQueryStableValidatorProxyModule,
} from "../../ignition/modules/linkedMultiQueryStableValidator";
import AuthV3ValidatorModule, {
  AuthV3ValidatorProxyModule,
} from "../../ignition/modules/authV3Validator";
import AuthV3_8_32ValidatorModule, {
  AuthV3_8_32ValidatorProxyModule,
} from "../../ignition/modules/authV3_8_32Validator";

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
      moduleFirstImplementation: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQueryMTPV2ValidatorModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_MTP.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_MTP.name],
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts],
    },
    {
      moduleFirstImplementation: CredentialAtomicQuerySigV2ValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_SIG.name],
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts],
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3ValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_V3.name],
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_V3.verificationOpts],
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3StableValidatorProxyModule,
      moduleFinalImplementation: CredentialAtomicQueryV3StableValidatorModule,
      moduleAt: CredentialAtomicQueryV3StableValidatorAtModule,
      name: contractsInfo.VALIDATOR_V3_STABLE.name,
      verifierNames: [
        contractsInfo.GROTH16_VERIFIER_V3_STABLE.name,
        contractsInfo.GROTH16_VERIFIER_V3_STABLE_16_16_64_16_32.name,
      ],
      verificationOpts: contractsInfo.VALIDATOR_V3_STABLE.verificationOpts,
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_V3_STABLE.verificationOpts,
        contractsInfo.GROTH16_VERIFIER_V3_STABLE_16_16_64_16_32.verificationOpts,
      ],
    },
    {
      moduleFirstImplementation: LinkedMultiQueryValidatorProxyModule,
      moduleFinalImplementation: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name],
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.verificationOpts,
      ],
    },
    {
      moduleFirstImplementation: LinkedMultiQueryStableValidatorProxyModule,
      moduleFinalImplementation: LinkedMultiQueryStableValidatorModule,
      moduleAt: LinkedMultiQueryStableValidatorAtModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      verifierNames: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.name,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_5.name,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_3.name,
      ],
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.verificationOpts,
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.verificationOpts,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_5.verificationOpts,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_3.verificationOpts,
      ],
    },
  ];

  const authValidators = [
    {
      moduleFirstImplementation: AuthV2ValidatorProxyModule,
      moduleFinalImplementation: AuthV2ValidatorModule,
      moduleAt: AuthV2ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V2.name],
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts],
    },
    {
      moduleFirstImplementation: AuthV3ValidatorProxyModule,
      moduleFinalImplementation: AuthV3ValidatorModule,
      moduleAt: AuthV3ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V3.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V3.name],
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V3.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V3.verificationOpts],
    },
    {
      moduleFirstImplementation: AuthV3_8_32ValidatorProxyModule,
      moduleFinalImplementation: AuthV3_8_32ValidatorModule,
      moduleAt: AuthV3_8_32ValidatorAtModule,
      name: contractsInfo.VALIDATOR_AUTH_V3_8_32.name,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name],
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V3_8_32.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.verificationOpts],
    },
    {
      moduleFirstImplementation: EthIdentityValidatorProxyModule,
      moduleFinalImplementation: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
  ];

  for (const validatorContract of [...requestValidators, ...authValidators]) {
    // First implementation
    const deployment = await ignition.deploy(validatorContract.moduleFirstImplementation as any, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    parameters[validatorContract.name.concat("AtModule")] = {
      proxyAddress: deployment.proxy.target,
      proxyAdminAddress: deployment.proxyAdmin.target,
    };
    parameters[validatorContract.name.concat("NewImplementationAtModule")] = {
      contractAddress: deployment.newImplementation.target,
    };
    if (
      validatorContract.verifierNames &&
      validatorContract.verifierNames.length == 1 &&
      deployment.groth16Verifier
    ) {
      parameters[validatorContract.verifierNames[0].concat("AtModule")] = {
        contractAddress: deployment.groth16Verifier.target,
      };
      console.log(
        `${validatorContract.verifierNames[0]} deployed to: ${deployment.groth16Verifier.target}`,
      );
    }

    if (
      validatorContract.verifierNames &&
      deployment.groth16VerifierV3Stable &&
      deployment.groth16VerifierV3Stable_16_16_64_16_32
    ) {
      parameters[validatorContract.verifierNames[0].concat("AtModule")] = {
        contractAddress: deployment.groth16VerifierV3Stable.target,
      };
      parameters[validatorContract.verifierNames[1].concat("AtModule")] = {
        contractAddress: deployment.groth16VerifierV3Stable_16_16_64_16_32.target,
      };
      console.log(
        `${validatorContract.verifierNames[0]} deployed to: ${deployment.groth16VerifierV3Stable.target}`,
      );
      console.log(
        `${validatorContract.verifierNames[1]} deployed to: ${deployment.groth16VerifierV3Stable_16_16_64_16_32.target}`,
      );
    }

    if (
      validatorContract.verifierNames &&
      deployment.groth16VerifierLinkedMultiQuery &&
      deployment.groth16VerifierLinkedMultiQuery5 &&
      deployment.groth16VerifierLinkedMultiQuery3
    ) {
      parameters[validatorContract.verifierNames[0].concat("AtModule")] = {
        contractAddress: deployment.groth16VerifierLinkedMultiQuery.target,
      };
      parameters[validatorContract.verifierNames[1].concat("AtModule")] = {
        contractAddress: deployment.groth16VerifierLinkedMultiQuery5.target,
      };
      parameters[validatorContract.verifierNames[2].concat("AtModule")] = {
        contractAddress: deployment.groth16VerifierLinkedMultiQuery3.target,
      };
      console.log(
        `${validatorContract.verifierNames[0]} deployed to: ${deployment.groth16VerifierLinkedMultiQuery.target}`,
      );
      console.log(
        `${validatorContract.verifierNames[1]} deployed to: ${deployment.groth16VerifierLinkedMultiQuery5.target}`,
      );
      console.log(
        `${validatorContract.verifierNames[2]} deployed to: ${deployment.groth16VerifierLinkedMultiQuery3.target}`,
      );
    }

    // Final implementation
    await ignition.deploy(validatorContract.moduleFinalImplementation as any, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });

    console.log(`${validatorContract.name} deployed to: ${deployment.proxy.target}`);

    if (validatorContract.verificationOpts) {
      await verifyContract(deployment.proxy.target, validatorContract.verificationOpts);
    }
    if (
      validatorContract.verifierVerificationOpts &&
      validatorContract.verifierVerificationOpts.length == 1 &&
      deployment.groth16Verifier
    ) {
      await verifyContract(
        deployment.groth16Verifier.target,
        validatorContract.verifierVerificationOpts[0],
      );
    }
    if (
      validatorContract.verifierVerificationOpts &&
      deployment.groth16VerifierV3Stable &&
      deployment.groth16VerifierV3Stable_16_16_64_16_32
    ) {
      await verifyContract(
        deployment.groth16VerifierV3Stable.target,
        validatorContract.verifierVerificationOpts[0],
      );
      await verifyContract(
        deployment.groth16VerifierV3Stable_16_16_64_16_32.target,
        validatorContract.verifierVerificationOpts[1],
      );
    }

    if (
      validatorContract.verifierVerificationOpts &&
      deployment.groth16VerifierLinkedMultiQuery &&
      deployment.groth16VerifierLinkedMultiQuery5 &&
      deployment.groth16VerifierLinkedMultiQuery3
    ) {
      await verifyContract(
        deployment.groth16VerifierLinkedMultiQuery.target,
        validatorContract.verifierVerificationOpts[0],
      );
      await verifyContract(
        deployment.groth16VerifierLinkedMultiQuery5.target,
        validatorContract.verifierVerificationOpts[1],
      );
      await verifyContract(
        deployment.groth16VerifierLinkedMultiQuery3.target,
        validatorContract.verifierVerificationOpts[2],
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
