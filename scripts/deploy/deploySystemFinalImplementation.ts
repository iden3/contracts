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

  if (
    !(await isContract(contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress)) &&
    deployStrategy === "create2"
  ) {
    const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
      strategy: "create2",
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
  }

  const requestValidators = [
    {
      module: CredentialAtomicQueryMTPV2ValidatorModule,
      contractAddress: contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      proxy: true,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorModule,
      contractAddress: contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      proxy: true,
    },
    {
      module: CredentialAtomicQueryV3ValidatorModule,
      contractAddress: contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      proxy: true,
    },
    {
      module: LinkedMultiQueryValidatorModule,
      contractAddress: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy: true,
    },
  ];

  const authValidators = [
    {
      authMethod: "authV2",
      module: AuthV2ValidatorModule,
      contractAddress: contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      proxy: true,
    },
    {
      authMethod: "ethIdentity",
      module: EthIdentityValidatorModule,
      contractAddress: contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      proxy: true,
    },
  ];

  const contracts = [
    {
      module: Poseidon1Module,
      contractAddress: contractsInfo.POSEIDON_1.unifiedAddress,
      name: contractsInfo.POSEIDON_1.name,
    },
    {
      module: Poseidon2Module,
      contractAddress: contractsInfo.POSEIDON_2.unifiedAddress,
      name: contractsInfo.POSEIDON_2.name,
    },
    {
      module: Poseidon3Module,
      contractAddress: contractsInfo.POSEIDON_3.unifiedAddress,
      name: contractsInfo.POSEIDON_3.name,
    },
    {
      module: Poseidon4Module,
      contractAddress: contractsInfo.POSEIDON_4.unifiedAddress,
      name: contractsInfo.POSEIDON_4.name,
    },
    {
      module: SmtLibModule,
      contractAddress: contractsInfo.SMT_LIB.unifiedAddress,
      name: contractsInfo.SMT_LIB.name,
    },
    {
      module: StateModule,
      contractAddress: contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      proxy: true,
    },
    {
      module: UniversalVerifierModule,
      contractAddress: contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      proxy: true,
    },
    {
      module: IdentityTreeStoreModule,
      contractAddress: contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      proxy: true,
    },
    ...requestValidators,
    ...authValidators,
  ];

  for (const contract of contracts) {
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
