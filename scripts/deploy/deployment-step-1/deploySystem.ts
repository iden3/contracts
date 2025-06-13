import fs from "fs";
import path from "path";
import { ethers, ignition } from "hardhat";
import Create2AddressAnchorModule from "../../../ignition/modules/create2AddressAnchor";
import { contractsInfo } from "../../../helpers/constants";
import {
  getChainId,
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
import { LinkedMultiQueryValidatorProxyModule } from "../../../ignition/modules/linkedMultiQuery";
import { AuthV2ValidatorProxyModule } from "../../../ignition/modules/authV2Validator";
import { EthIdentityValidatorProxyModule } from "../../../ignition/modules/ethIdentityValidator";
import {
  AuthV2ValidatorAtModule,
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  IdentityTreeStoreAtModule,
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

async function getDeployedAddresses() {
  let deployedAddresses = {};
  const chainId = await getChainId();
  try {
    const deployedAddressesPath = path.join(
      __dirname,
      `../../../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
    );
    deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
  } catch (error) {
    //console.error("Error reading deployed addresses file:", error);
  }
  return deployedAddresses;
}

async function main() {
  // const config = getConfig();
  const deployStrategy: "basic" | "create2" = "create2";
  /*config.deployStrategy == "create2" ? "create2" : "basic";*/

  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();

  parameters.StateProxyFinalImplementationModule.defaultIdType = (
    await getDefaultIdType()
  ).defaultIdType;
  const deployedAddresses = await getDeployedAddresses();

  parameters.Create2AddressAnchorAtModule = {
    contractAddress: contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress,
  };
  if (!(await isContract(contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress))) {
    const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
    });

    const contractAddress = await create2AddressAnchor.getAddress();
    if (contractAddress !== contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress) {
      throw Error(
        `The contract was supposed to be deployed to ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}, but it was deployed to ${contractAddress}`,
      );
    }

    console.log(`Create2AddressAnchor deployed to: ${contractAddress}`);
  } else {
    console.log(
      `Create2AddressAnchor already deployed to: ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}`,
    );

    if (!deployedAddresses["Create2AddressAnchorModule#Create2AddressAnchor"]) {
      // Use the module to get the address into the deployed address registry
      await ignition.deploy(Create2AddressAnchorAtModule, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
      });
    }
  }

  //TODO: IMPORTANT. Get your specific unified addresses:
  // 1. Run "npx hardhat test test/get-own-unified-addresses.test.ts"
  // 2. Replace addresses in specific proxies "proxyAddress" in ignition/modules/params/<network>.json file
  // 3. Leave "proxyAdminAddress" as it is. It will be calculated automatically overwriten at the end of the script
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
        parameters["StateAtModule"].proxyAddress || contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      proxy: true,
      verificationOpts: contractsInfo.STATE.verificationOpts,
    },
    {
      module: UniversalVerifierProxyModule,
      moduleAt: UniversalVerifierAtModule,
      contractAddress:
        parameters["UniversalVerifierAtModule"].proxyAddress ||
        contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      proxy: true,
      verificationOpts: contractsInfo.UNIVERSAL_VERIFIER.verificationOpts,
    },
    {
      module: IdentityTreeStoreProxyModule,
      moduleAt: IdentityTreeStoreAtModule,
      contractAddress:
        parameters["IdentityTreeStoreAtModule"].proxyAddress ||
        contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      proxy: true,
      verificationOpts: contractsInfo.IDENTITY_TREE_STORE.verificationOpts,
    },
    {
      module: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryMTPV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      proxy: true,
      verificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorProxyModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQuerySigV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      proxy: true,
      verificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts,
    },
    {
      module: CredentialAtomicQueryV3ValidatorProxyModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryV3ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      proxy: true,
      verificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3.verificationOpts,
    },
    {
      module: LinkedMultiQueryValidatorProxyModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress:
        parameters["LinkedMultiQueryValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy: true,
      verificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      verifierVerificationOpts:
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.verificationOpts,
    },
    {
      module: AuthV2ValidatorProxyModule,
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress:
        parameters["AuthV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      proxy: true,
      verificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
    },
    {
      module: EthIdentityValidatorProxyModule,
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress:
        parameters["EthIdentityValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      proxy: true,
      verificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
    },
    {
      module: VCPaymentProxyModule,
      moduleAt: VCPaymentAtModule,
      contractAddress:
        parameters["VCPaymentAtModule"].proxyAddress || contractsInfo.VC_PAYMENT.unifiedAddress,
      name: contractsInfo.VC_PAYMENT.name,
      proxy: true,
      verificationOpts: contractsInfo.VC_PAYMENT.verificationOpts,
    },
    {
      module: MCPaymentProxyModule,
      moduleAt: MCPaymentAtModule,
      contractAddress:
        parameters["MCPaymentAtModule"].proxyAddress || contractsInfo.MC_PAYMENT.unifiedAddress,
      name: contractsInfo.MC_PAYMENT.name,
      proxy: true,
      verificationOpts: contractsInfo.MC_PAYMENT.verificationOpts,
    },
  ];

  for (const contract of contracts) {
    console.log(`Deploying ${contract.name}...`);
    parameters[contract.moduleAt.id] = contract.proxy
      ? {
          proxyAddress: contract.contractAddress,
          proxyAdminAddress: contract.proxy
            ? ethers.getCreateAddress({ from: contract.contractAddress, nonce: 1 })
            : undefined,
        }
      : {
          contractAddress: contract.contractAddress,
        };

    if (!(await isContract(contract.contractAddress))) {
      const deployedContract: any = await ignition.deploy(contract.module, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
      });
      console.log(
        `${contract.name} deployed to: ${contract.proxy ? deployedContract.proxy.target : contract.contractAddress}`,
      );

      // Verify contracts
      if (contract.proxy && contract.verificationOpts) {
        await verifyContract(deployedContract.proxy.target, contract.verificationOpts);
        await verifyContract(deployedContract.newImplementation.target, {
          constructorArgsImplementation: [],
          libraries: {},
        });
      }
      if (contract.verifierVerificationOpts && deployedContract.groth16Verifier) {
        await verifyContract(
          deployedContract.groth16Verifier.target,
          contract.verifierVerificationOpts,
        );
      }
      if (!contract.proxy) {
        await verifyContract(deployedContract[Object.keys(deployedContract)[0]].target, {
          constructorArgsImplementation: [],
          libraries: {},
        });
      }
    } else {
      console.log(`${contract.name} already deployed to: ${contract.contractAddress}`);
      // Use the module to get the address into the deployed address registry
      await ignition.deploy(contract.moduleAt, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
      });
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
