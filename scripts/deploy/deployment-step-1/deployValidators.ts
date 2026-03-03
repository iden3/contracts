import {
  getConfig,
  getDeploymentParameters,
  isContract,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { CredentialAtomicQueryMTPV2ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { contractsInfo } from "../../../helpers/constants";
import { CredentialAtomicQuerySigV2ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import { CredentialAtomicQueryV3ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import { AuthV2ValidatorProxyModule } from "../../../ignition/modules/authV2Validator";
import { EthIdentityValidatorProxyModule } from "../../../ignition/modules/ethIdentityValidator";
import { LinkedMultiQueryValidatorProxyModule } from "../../../ignition/modules/linkedMultiQueryValidator";
import { network } from "hardhat";
import { CredentialAtomicQueryV3StableValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryV3StableValidator";
import { LinkedMultiQueryStableValidatorProxyModule } from "../../../ignition/modules/linkedMultiQueryStableValidator";
import { AuthV3ValidatorProxyModule } from "../../../ignition/modules/authV3Validator";
import { AuthV3_8_32ValidatorProxyModule } from "../../../ignition/modules/authV3_8_32Validator";
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
} from "../../../ignition/modules/contractsAt";

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
      name: contractsInfo.VALIDATOR_MTP.name,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQueryMTPV2ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_MTP.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_MTP.name],
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts],
    },
    {
      moduleFirstImplementation: CredentialAtomicQuerySigV2ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_SIG.name,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQuerySigV2ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_SIG.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_SIG.name],
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts],
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_V3.name,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQueryV3ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_V3.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_V3.name],
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_V3.verificationOpts],
    },
    {
      moduleFirstImplementation: CredentialAtomicQueryV3StableValidatorProxyModule,
      name: contractsInfo.VALIDATOR_V3_STABLE.name,
      moduleAt: CredentialAtomicQueryV3StableValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQueryV3StableValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_V3_STABLE.unifiedAddress,
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
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress:
        parameters[`${LinkedMultiQueryValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name],
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.verificationOpts,
      ],
    },
    {
      moduleFirstImplementation: LinkedMultiQueryStableValidatorProxyModule,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      moduleAt: LinkedMultiQueryStableValidatorAtModule,
      contractAddress:
        parameters[`${LinkedMultiQueryStableValidatorAtModule.id}`]
          .proxyAddress || contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.unifiedAddress,
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
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress:
        parameters[`${AuthV2ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V2.name],
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts],
    },
    {
      moduleFirstImplementation: AuthV3ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_AUTH_V3.name,
      moduleAt: AuthV3ValidatorAtModule,
      contractAddress:
        parameters[`${AuthV3ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V3.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V3.name],
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V3.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V3.verificationOpts],
    },
    {
      moduleFirstImplementation: AuthV3_8_32ValidatorProxyModule,
      name: contractsInfo.VALIDATOR_AUTH_V3_8_32.name,
      moduleAt: AuthV3_8_32ValidatorAtModule,
      contractAddress:
        parameters[`${AuthV3_8_32ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V3_8_32.unifiedAddress,
      verifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name],
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V3_8_32.verificationOpts,
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.verificationOpts],
    },
    {
      moduleFirstImplementation: EthIdentityValidatorProxyModule,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress:
        parameters[`${EthIdentityValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
  ];

  for (const validatorContract of [...requestValidators, ...authValidators]) {
    if (!(await isContract(validatorContract.contractAddress))) {
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
    } else {
      console.log(
        `${validatorContract.name} already deployed to: ${validatorContract.contractAddress}`,
      );
      try {
        // Use the module to get the address into the deployed address registry
        await ignition.deploy(validatorContract.moduleAt, {
          strategy: deployStrategy,
          defaultSender: await signer.getAddress(),
          parameters: parameters,
          deploymentId: deploymentId,
        });
      } catch (e: any) {
        if (!e.message.includes("bytecodes have been changed")) {
          throw e;
        }
      }
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
