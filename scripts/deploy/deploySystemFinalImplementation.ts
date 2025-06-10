import fs from "fs";
import path from "path";
import hre, { ethers, ignition } from "hardhat";
import Create2AddressAnchorModule from "../../ignition/modules/create2AddressAnchor";
import { contractsInfo } from "../../helpers/constants";
import { getChainId, isContract } from "../../helpers/helperUtils";
import {
  Poseidon1Module,
  Poseidon2Module,
  Poseidon3Module,
  Poseidon4Module,
  SmtLibModule,
} from "../../ignition";
import StateModule from "../../ignition/modules/state";
import UniversalVerifierModule from "../../ignition/modules/universalVerifier";
import IdentityTreeStoreModule from "../../ignition/modules/identityTreeStore";
import CredentialAtomicQueryMTPV2ValidatorModule from "../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import CredentialAtomicQuerySigV2ValidatorModule from "../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "../../ignition/modules/credentialAtomicQueryV3Validator";
import LinkedMultiQueryValidatorModule from "../../ignition/modules/linkedMultiQuery";
import AuthV2ValidatorModule from "../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule from "../../ignition/modules/ethIdentityValidator";
import {
  AuthV2ValidatorAtModule,
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  EthIdentityValidatorAtModule,
  IdentityTreeStoreAtModule,
  LinkedMultiQueryValidatorAtModule,
  Poseidon1AtModule,
  Poseidon2AtModule,
  Poseidon3AtModule,
  Poseidon4AtModule,
  SmtLibAtModule,
  StateAtModule,
  UniversalVerifierAtModule,
} from "../../ignition/modules/contractsAt";

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

  const parameters = JSON.parse(
    fs
      .readFileSync(path.join(__dirname, `../../ignition/modules/params/${networkName}.json`))
      .toString(),
  );

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

  const requestValidators = [
    {
      module: CredentialAtomicQueryMTPV2ValidatorModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress: "0xEB0057f8702Aa21e819f219a93bB74fB133F3B05", //contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      proxy: true,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress: "0x2F70cab6a709dca45B0d5A29D54f3eCc89e8499f", //contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      proxy: true,
    },
    {
      module: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress: "0x38d5B5fE4734673b8B303FE5DA29e0B7b3a5e252", //contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      proxy: true,
    },
    {
      module: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress: "0x2BF5BdbaBA432ee5E21C61eAAD10fd1a812F3Abc", //contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy: true,
    },
  ];

  const authValidators = [
    {
      authMethod: "authV2",
      module: AuthV2ValidatorModule,
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress: "0x43c152c690596eC28b5360385526d63cd3233D92", //contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      proxy: true,
    },
    {
      authMethod: "ethIdentity",
      module: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress: "0xf873cf19A5cBDa8b009c2A419Fa140Fcc9218874", //contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      proxy: true,
    },
  ];

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
      module: StateModule,
      moduleAt: StateAtModule,
      contractAddress: "0xaea923d71Bc5ED3A622D4DfCF2f9C338889b1c70", // contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      proxy: true,
    },
    {
      module: UniversalVerifierModule,
      moduleAt: UniversalVerifierAtModule,
      contractAddress: "0x55743732c60abb7d7F53a00aFdE5021479b420F0", //contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      proxy: true,
    },
    {
      module: IdentityTreeStoreModule,
      moduleAt: IdentityTreeStoreAtModule,
      contractAddress: "0x8A38f3D19437f03c254F1CCDED0F161C507d8597", //contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      proxy: true,
    },
    ...requestValidators,
    ...authValidators,
  ];

  for (const contract of contracts) {
    console.log(`Deploying ${contract.name}...`);
    parameters[contract.moduleAt.id] = {
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
    }
  }

  // get UniversalVerifier contract
  const universalVerifier = (
    await ignition.deploy(UniversalVerifierModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    })
  ).universalVerifier;

  for (const validator of requestValidators) {
    const validatorDeployed = await ignition.deploy(validator.module, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    if (!(await universalVerifier.isWhitelistedValidator(validatorDeployed.proxy.target))) {
      await universalVerifier.addValidatorToWhitelist(validatorDeployed.proxy.target);
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} added to whitelisted validators`,
      );
    } else {
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} already whitelisted`,
      );
    }
  }

  for (const validator of authValidators) {
    const validatorDeployed = await ignition.deploy(validator.module, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    if (!(await universalVerifier.authMethodExists(validator.authMethod))) {
      await universalVerifier.setAuthMethod({
        authMethod: validator.authMethod,
        validator: validatorDeployed.proxy.target,
        params: "0x",
      });
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} added to auth methods`,
      );
    } else {
      console.log(
        `${validator.name} in address ${validatorDeployed.proxy.target} already added to auth methods`,
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
