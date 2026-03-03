import Create2AddressAnchorModule from "../../../ignition/modules/create2AddressAnchor";
import { contractsInfo } from "../../../helpers/constants";
import {
  getChainId,
  getConfig,
  getDefaultIdType,
  getDeploymentParameters,
  isContract,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import {
  MCPaymentProxyModule,
  Poseidon1Module,
  Poseidon2Module,
  Poseidon3Module,
  Poseidon4Module,
  SmtLibModule,
  VCPaymentProxyModule,
} from "../../../ignition";
import { StateProxyModule } from "../../../ignition/modules/state";
import { UniversalVerifierProxyModule } from "../../../ignition/modules/universalVerifier";
import { IdentityTreeStoreProxyModule } from "../../../ignition/modules/identityTreeStore";
import { CredentialAtomicQueryMTPV2ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { CredentialAtomicQuerySigV2ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import { CredentialAtomicQueryV3ValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import { LinkedMultiQueryValidatorProxyModule } from "../../../ignition/modules/linkedMultiQueryValidator";
import { AuthV2ValidatorProxyModule } from "../../../ignition/modules/authV2Validator";
import { EthIdentityValidatorProxyModule } from "../../../ignition/modules/ethIdentityValidator";
import {
  AuthV2ValidatorAtModule,
  AuthV3_8_32ValidatorAtModule,
  AuthV3ValidatorAtModule,
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3StableValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  IdentityTreeStoreAtModule,
  LinkedMultiQueryStableValidatorAtModule,
  LinkedMultiQueryValidatorAtModule,
  MCPaymentAtModule,
  Poseidon1AtModule,
  Poseidon2AtModule,
  Poseidon3AtModule,
  Poseidon4AtModule,
  SmtLibAtModule,
  StateAtModule,
  UniversalVerifierAtModule,
  VCPaymentAtModule,
} from "../../../ignition/modules/contractsAt";
import { network } from "hardhat";
import { AuthV3ValidatorProxyModule } from "../../../ignition/modules/authV3Validator";
import { AuthV3_8_32ValidatorProxyModule } from "../../../ignition/modules/authV3_8_32Validator";
import { CredentialAtomicQueryV3StableValidatorProxyModule } from "../../../ignition/modules/credentialAtomicQueryV3StableValidator";
import { LinkedMultiQueryStableValidatorProxyModule } from "../../../ignition/modules/linkedMultiQueryStableValidator";

const { ethers, ignition } = await network.connect();

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  //TODO: IMPORTANT. Get your specific unified addresses first:
  // 1. Specify "DeploymentId" for your contracts in ignition/modules/params/<network>.json file
  // 2. Run "npx hardhat test test/get-own-unified-addresses.test.ts"
  // 3. Replace addresses in specific proxies "proxyAddress" in ignition/modules/params/<network>.json file
  // 4. Leave "proxyAdminAddress" as it is. It will be calculated automatically overwriten at the end of the script
  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;
  parameters.StateProxyFinalImplementationModule.defaultIdType = (
    await getDefaultIdType()
  ).defaultIdType;

  if (!parameters.Create2AddressAnchorAtModule) {
    parameters.Create2AddressAnchorAtModule = {
      contractAddress: contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress,
    };
  }

  if (!(await isContract(parameters.Create2AddressAnchorAtModule.contractAddress))) {
    const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      deploymentId: deploymentId,
    });

    const contractAddress = await create2AddressAnchor.getAddress();
    if (contractAddress !== contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress) {
      console.log(
        `The contract was supposed to be deployed to ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}, but it was deployed to ${contractAddress}`,
      );
    }
    parameters.Create2AddressAnchorAtModule = {
      contractAddress: contractAddress,
    };
    console.log(`Create2AddressAnchor deployed to: ${contractAddress}`);
  } else {
    console.log(
      `Create2AddressAnchor already deployed to: ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}`,
    );

    // Use the module to get the address into the deployed address registry
    await ignition.deploy(Create2AddressAnchorAtModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
  }

  const contracts = [
    {
      module: Poseidon1Module,
      moduleAt: Poseidon1AtModule,
      contractAddress: contractsInfo.POSEIDON_1.unifiedAddress,
      name: contractsInfo.POSEIDON_1.name,
    },
    {
      module: Poseidon2Module,
      moduleAt: Poseidon2AtModule,
      contractAddress: contractsInfo.POSEIDON_2.unifiedAddress,
      name: contractsInfo.POSEIDON_2.name,
    },
    {
      module: Poseidon3Module,
      moduleAt: Poseidon3AtModule,
      contractAddress: contractsInfo.POSEIDON_3.unifiedAddress,
      name: contractsInfo.POSEIDON_3.name,
    },
    {
      module: Poseidon4Module,
      moduleAt: Poseidon4AtModule,
      contractAddress: contractsInfo.POSEIDON_4.unifiedAddress,
      name: contractsInfo.POSEIDON_4.name,
    },
    {
      module: SmtLibModule,
      moduleAt: SmtLibAtModule,
      contractAddress: contractsInfo.SMT_LIB.unifiedAddress,
      name: contractsInfo.SMT_LIB.name,
      verificationOpts: contractsInfo.SMT_LIB.verificationOpts,
    },
    {
      module: StateProxyModule,
      moduleAt: StateAtModule,
      contractAddress:
        parameters[`${StateAtModule.id}`].proxyAddress || contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.name,
      verificationOpts: contractsInfo.STATE.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.verificationOpts,
    },
    {
      module: UniversalVerifierProxyModule,
      moduleAt: UniversalVerifierAtModule,
      contractAddress:
        parameters[`${UniversalVerifierAtModule.id}`].proxyAddress ||
        contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      isProxy: true,
      verificationOpts: contractsInfo.UNIVERSAL_VERIFIER.verificationOpts,
    },
    {
      module: IdentityTreeStoreProxyModule,
      moduleAt: IdentityTreeStoreAtModule,
      contractAddress:
        parameters[`${IdentityTreeStoreAtModule.id}`].proxyAddress ||
        contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      isProxy: true,
      verificationOpts: contractsInfo.IDENTITY_TREE_STORE.verificationOpts,
    },
    {
      module: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQueryMTPV2ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorProxyModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQuerySigV2ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts,
    },
    {
      module: CredentialAtomicQueryV3ValidatorProxyModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQueryV3ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3.verificationOpts,
    },
    {
      module: CredentialAtomicQueryV3StableValidatorProxyModule,
      moduleAt: CredentialAtomicQueryV3StableValidatorAtModule,
      contractAddress:
        parameters[`${CredentialAtomicQueryV3StableValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_V3_STABLE.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3_STABLE.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_V3_STABLE.name,
      verificationOpts: contractsInfo.VALIDATOR_V3_STABLE.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3_STABLE.verificationOpts,
    },
    {
      module: LinkedMultiQueryValidatorProxyModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress:
        parameters[`${LinkedMultiQueryValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name,
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      verifierVerificationOpts:
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.verificationOpts,
    },
    {
      module: LinkedMultiQueryStableValidatorProxyModule,
      moduleAt: LinkedMultiQueryStableValidatorAtModule,
      contractAddress:
        parameters[`${LinkedMultiQueryStableValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.name,
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.verificationOpts,
    },
    {
      module: AuthV2ValidatorProxyModule,
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress:
        parameters[`${AuthV2ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
    },
    {
      module: AuthV3ValidatorProxyModule,
      moduleAt: AuthV3ValidatorAtModule,
      contractAddress:
        parameters[`${AuthV3ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V3.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V3.name,
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V3.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V3.verificationOpts,
    },
    {
      module: AuthV3_8_32ValidatorProxyModule,
      moduleAt: AuthV3_8_32ValidatorAtModule,
      contractAddress:
        parameters[`${AuthV3_8_32ValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V3_8_32.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V3_8_32.name,
      isProxy: true,
      verifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name,
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V3_8_32.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.verificationOpts,
    },
    {
      module: EthIdentityValidatorProxyModule,
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress:
        parameters[`${EthIdentityValidatorAtModule.id}`].proxyAddress ||
        contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      isProxy: true,
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
    {
      module: VCPaymentProxyModule,
      moduleAt: VCPaymentAtModule,
      contractAddress:
        parameters[`${VCPaymentAtModule.id}`].proxyAddress || contractsInfo.VC_PAYMENT.unifiedAddress,
      name: contractsInfo.VC_PAYMENT.name,
      isProxy: true,
      verificationOpts: contractsInfo.VC_PAYMENT.verificationOpts,
    },
    {
      module: MCPaymentProxyModule,
      moduleAt: MCPaymentAtModule,
      contractAddress:
        parameters[`${MCPaymentAtModule.id}`].proxyAddress || contractsInfo.MC_PAYMENT.unifiedAddress,
      name: contractsInfo.MC_PAYMENT.name,
      isProxy: true,
      verificationOpts: contractsInfo.MC_PAYMENT.verificationOpts,
    },
  ];

  for (const contract of contracts) {
    console.log(`Deploying ${contract.name}...`);
    let proxyAdminAddress = contract.isProxy
      ? ethers.getCreateAddress({ from: contract.contractAddress, nonce: 1 })
      : undefined;

    // special case for Polygon Amoy and Polygon PoS with state proxy admin address
    const chainId = await getChainId();
    if (contract.moduleAt.id === "StateAtModule" && (chainId == 80002 || chainId == 137)) {
      if (chainId == 80002) {
        proxyAdminAddress = "0xdc2A724E6bd60144Cde9DEC0A38a26C619d84B90";
      } else {
        proxyAdminAddress = "0xA8bbF6132e4021b5D244a4DdD75dE5FFCfBd514A";
      }
    }

    parameters[contract.moduleAt.id] = contract.isProxy
      ? {
          proxyAddress: contract.contractAddress,
          proxyAdminAddress: proxyAdminAddress,
        }
      : {
          contractAddress: contract.contractAddress,
        };

    if (!(await isContract(contract.contractAddress))) {
      const deployedContract: any = await ignition.deploy(contract.module, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
        deploymentId: deploymentId,
      });
      console.log(
        `${contract.name} deployed to: ${contract.isProxy ? deployedContract.proxy.target : contract.contractAddress}`,
      );

      if (contract.name == contractsInfo.STATE.name) {
        parameters[contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name.concat("AtModule")] = {
          contractAddress: deployedContract.crossChainProofValidator.target,
        };
        parameters[contractsInfo.STATE_LIB.name.concat("AtModule")] = {
          contractAddress: deployedContract.stateLib.target,
        };
      }

      if (contract.name == contractsInfo.UNIVERSAL_VERIFIER.name) {
        parameters["VerifierLibAtModule"] = {
          contractAddress: deployedContract.verifierLib.target,
        };
        await verifyContract(deployedContract.verifierLib.target, {
          constructorArgsImplementation: [],
          libraries: {},
        });
      }

      // Verify contracts
      if (contract.isProxy && contract.verificationOpts) {
        parameters[contract.moduleAt.id] = {
          proxyAddress: deployedContract.proxy.target,
          proxyAdminAddress: ethers.getCreateAddress({
            from: deployedContract.proxy.target,
            nonce: 1,
          }),
        };
        parameters[contract.name.concat("NewImplementationAtModule")] = {
          contractAddress: deployedContract.newImplementation.target,
        };
        await verifyContract(deployedContract.proxy.target, contract.verificationOpts);
        await verifyContract(deployedContract.newImplementation.target, {
          constructorArgsImplementation: [],
          libraries: {},
        });
      }
      if (contract.verifierVerificationOpts && deployedContract.groth16Verifier) {
        parameters[contract.verifierName.concat("AtModule")] = {
          contractAddress: deployedContract.groth16Verifier.target,
        };
        await verifyContract(
          deployedContract.groth16Verifier.target,
          contract.verifierVerificationOpts,
        );
      }
      if (!contract.isProxy) {
        parameters[contract.moduleAt.id] = {
          contractAddress: deployedContract[Object.keys(deployedContract)[0]].target,
        };
        await verifyContract(deployedContract[Object.keys(deployedContract)[0]].target, {
          constructorArgsImplementation: [],
          libraries: {},
        });
      }
    } else {
      console.log(`${contract.name} already deployed to: ${contract.contractAddress}`);
      try {
        // Use the module to get the address into the deployed address registry
        await ignition.deploy(contract.moduleAt, {
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
