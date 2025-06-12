import fs from "fs";
import path from "path";
import hre, { ethers, ignition } from "hardhat";
import Create2AddressAnchorModule from "../../ignition/modules/create2AddressAnchor";
import { contractsInfo } from "../../helpers/constants";
import { getChainId, getDefaultIdType, isContract } from "../../helpers/helperUtils";
import {
  MCPaymentProxyModule,
  Poseidon1Module,
  Poseidon2Module,
  Poseidon3Module,
  Poseidon4Module,
  SmtLibModule,
  VCPaymentProxyModule,
} from "../../ignition";
import {
  CrossChainProofValidatorModule,
  StateLibModule,
  StateProxyModule,
} from "../../ignition/modules/state";
import {
  UniversalVerifierProxyModule,
  VerifierLibModule,
} from "../../ignition/modules/universalVerifier";
import { IdentityTreeStoreProxyModule } from "../../ignition/modules/identityTreeStore";
import { CredentialAtomicQueryMTPV2ValidatorProxyModule } from "../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import { CredentialAtomicQuerySigV2ValidatorProxyModule } from "../../ignition/modules/credentialAtomicQuerySigV2Validator";
import { CredentialAtomicQueryV3ValidatorProxyModule } from "../../ignition/modules/credentialAtomicQueryV3Validator";
import { LinkedMultiQueryValidatorProxyModule } from "../../ignition/modules/linkedMultiQuery";
import { AuthV2ValidatorProxyModule } from "../../ignition/modules/authV2Validator";
import { EthIdentityValidatorProxyModule } from "../../ignition/modules/ethIdentityValidator";
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
} from "../../ignition/modules/contractsAt";
import { Groth16VerifierStateTransitionModule } from "../../ignition/modules/groth16verifiers";

async function getDeployedAddresses() {
  let deployedAddresses = {};
  const chainId = await getChainId();
  try {
    const deployedAddressesPath = path.join(
      __dirname,
      `../../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
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

  const networkName = hre.network.name;

  const paramsPath = path.join(__dirname, `../../ignition/modules/params/${networkName}.json`);
  const parameters = JSON.parse(fs.readFileSync(paramsPath).toString());

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
    },
    {
      module: StateProxyModule,
      moduleAt: StateAtModule,
      contractAddress:
        parameters["StateAtModule"].proxyAddress || contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      proxy: true,
    },
   /* {
      module: UniversalVerifierProxyModule,
      moduleAt: UniversalVerifierAtModule,
      contractAddress:
        parameters["UniversalVerifierAtModule"].proxyAddress ||
        contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      proxy: true,
    },*/
    {
      module: IdentityTreeStoreProxyModule,
      moduleAt: IdentityTreeStoreAtModule,
      contractAddress:
        parameters["IdentityTreeStoreAtModule"].proxyAddress ||
        contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      proxy: true,
    },
    /*{
      module: CredentialAtomicQueryMTPV2ValidatorProxyModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryMTPV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      proxy: true,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorProxyModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQuerySigV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      proxy: true,
    },
    {
      module: CredentialAtomicQueryV3ValidatorProxyModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryV3ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      proxy: true,
    },
    {
      module: LinkedMultiQueryValidatorProxyModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress:
        parameters["LinkedMultiQueryValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy: true,
    },
    {
      module: AuthV2ValidatorProxyModule,
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress:
        parameters["AuthV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      proxy: true,
    },
    {
      module: EthIdentityValidatorProxyModule,
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress:
        parameters["EthIdentityValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      proxy: true,
    },*/
    {
      module: VCPaymentProxyModule,
      moduleAt: VCPaymentAtModule,
      contractAddress:
        parameters["VCPaymentAtModule"].proxyAddress || contractsInfo.VC_PAYMENT.unifiedAddress,
      name: contractsInfo.VC_PAYMENT.name,
      proxy: true,
    },
    {
      module: MCPaymentProxyModule,
      moduleAt: MCPaymentAtModule,
      contractAddress:
        parameters["MCPaymentAtModule"].proxyAddress || contractsInfo.MC_PAYMENT.unifiedAddress,
      name: contractsInfo.MC_PAYMENT.name,
      proxy: true,
    },
  ];

  /* const basicStrategyContracts = [
    { module: CrossChainProofValidatorModule, name: "CrossChainProofValidator" },
    { module: Groth16VerifierStateTransitionModule, name: "Groth16VerifierStateTransition" },
    { module: StateLibModule, name: "StateLib" },
    { module: VerifierLibModule, name: "VerifierLib" },
  ];

  for (const contract of basicStrategyContracts) {
    const deployedContract = await ignition.deploy(contract.module, {
      strategy: "basic",
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    console.log(
      `${contract.name} deployed to: ${deployedContract[Object.keys(deployedContract)[0]].target}`,
    );
  } */

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

  fs.writeFileSync(paramsPath, JSON.stringify(parameters, null, 2), {
    encoding: "utf8",
    flag: "w",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
