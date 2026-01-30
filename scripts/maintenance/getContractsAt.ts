import { contractsInfo } from "../../helpers/constants";
import {
  getChainId,
  getDefaultIdType,
  getDeploymentParameters,
  isContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
import {
  AuthV2ValidatorAtModule,
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
} from "../../ignition/modules/contractsAt";
import { network } from "hardhat";

const { ethers, ignition } = await network.connect();

async function main() {
  // const config = getConfig();
  const deployStrategy: "basic" | "create2" = "create2";
  /*config.deployStrategy == "create2" ? "create2" : "basic";*/

  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();

  parameters.StateProxyFinalImplementationModule.defaultIdType = (
    await getDefaultIdType()
  ).defaultIdType;

  parameters.Create2AddressAnchorAtModule = {
    contractAddress: contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress,
  };
  if (await isContract(contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress)) {
    console.log(
      `Create2AddressAnchor already deployed to: ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}`,
    );

    // Use the module to get the address into the deployed address registry
    await ignition.deploy(Create2AddressAnchorAtModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
  }

  //TODO: IMPORTANT. Get your specific unified addresses:
  // 1. Run "npx hardhat test test/get-own-unified-addresses.test.ts"
  // 2. Replace addresses in specific proxies "proxyAddress" in ignition/modules/params/<network>.json file
  // 3. Leave "proxyAdminAddress" as it is. It will be calculated automatically overwriten at the end of the script
  const contracts = [
    {
      moduleAt: Poseidon1AtModule,
      contractAddress: contractsInfo.POSEIDON_1.unifiedAddress,
      name: contractsInfo.POSEIDON_1.name,
    },
    {
      moduleAt: Poseidon2AtModule,
      contractAddress: contractsInfo.POSEIDON_2.unifiedAddress,
      name: contractsInfo.POSEIDON_2.name,
    },
    {
      moduleAt: Poseidon3AtModule,
      contractAddress: contractsInfo.POSEIDON_3.unifiedAddress,
      name: contractsInfo.POSEIDON_3.name,
    },
    {
      moduleAt: Poseidon4AtModule,
      contractAddress: contractsInfo.POSEIDON_4.unifiedAddress,
      name: contractsInfo.POSEIDON_4.name,
    },
    {
      moduleAt: SmtLibAtModule,
      contractAddress: contractsInfo.SMT_LIB.unifiedAddress,
      name: contractsInfo.SMT_LIB.name,
    },
    {
      moduleAt: StateAtModule,
      contractAddress:
        parameters["StateAtModule"].proxyAddress || contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      proxy: true,
    },
    {
      moduleAt: UniversalVerifierAtModule,
      contractAddress:
        parameters["UniversalVerifierAtModule"].proxyAddress ||
        contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      proxy: true,
    },
    {
      moduleAt: IdentityTreeStoreAtModule,
      contractAddress:
        parameters["IdentityTreeStoreAtModule"].proxyAddress ||
        contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      proxy: true,
    },
    {
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryMTPV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      proxy: true,
    },
    {
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQuerySigV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      proxy: true,
    },
    {
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryV3ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      proxy: true,
    },
    {
      moduleAt: CredentialAtomicQueryV3StableValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryV3StableValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_V3_STABLE.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3_STABLE.name,
      proxy: true,
    },    
    {
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress:
        parameters["LinkedMultiQueryValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy: true,
    },
    {
      moduleAt: LinkedMultiQueryStableValidatorAtModule,
      contractAddress:
        parameters["LinkedMultiQueryStableValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      proxy: true,
    },    
    {
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress:
        parameters["AuthV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      proxy: true,
    },
    {
      moduleAt: AuthV3ValidatorAtModule,
      contractAddress:
        parameters["AuthV3ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V3.name,
      proxy: true,
    },    
    {
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress:
        parameters["EthIdentityValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      proxy: true,
    },
    {
      moduleAt: VCPaymentAtModule,
      contractAddress:
        parameters["VCPaymentAtModule"].proxyAddress || contractsInfo.VC_PAYMENT.unifiedAddress,
      name: contractsInfo.VC_PAYMENT.name,
      proxy: true,
    },
    {
      moduleAt: MCPaymentAtModule,
      contractAddress:
        parameters["MCPaymentAtModule"].proxyAddress || contractsInfo.MC_PAYMENT.unifiedAddress,
      name: contractsInfo.MC_PAYMENT.name,
      proxy: true,
    },
  ];

  for (const contract of contracts) {
    console.log(`Get contract ${contract.name}...`);

    if (await isContract(contract.contractAddress)) {
      console.log(`${contract.name} already deployed to: ${contract.contractAddress}`);

      let proxyAdminAddress = contract.proxy
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

      parameters[contract.moduleAt.id] = contract.proxy
        ? {
            proxyAddress: contract.contractAddress,
            proxyAdminAddress: proxyAdminAddress,
          }
        : {
            contractAddress: contract.contractAddress,
          };
      try {
        // Use the module to get the address into the deployed address registry
        await ignition.deploy(contract.moduleAt, {
          strategy: deployStrategy,
          defaultSender: await signer.getAddress(),
          parameters: parameters,
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
