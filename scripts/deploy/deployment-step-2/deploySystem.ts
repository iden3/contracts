import fs from "fs";
import path from "path";
import { ethers, ignition } from "hardhat";
import Create2AddressAnchorModule from "../../../ignition/modules/create2AddressAnchor";
import { contractsInfo } from "../../../helpers/constants";
import {
  getChainId,
  getConfig,
  getDeploymentParameters,
  isContract,
} from "../../../helpers/helperUtils";
import StateModule from "../../../ignition/modules/state";
import UniversalVerifierModule from "../../../ignition/modules/universalVerifier";
import IdentityTreeStoreModule from "../../../ignition/modules/identityTreeStore";
import CredentialAtomicQueryMTPV2ValidatorModule from "../../../ignition/modules/credentialAtomicQueryMTPV2Validator";
import CredentialAtomicQuerySigV2ValidatorModule from "../../../ignition/modules/credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "../../../ignition/modules/credentialAtomicQueryV3Validator";
import LinkedMultiQueryValidatorModule from "../../../ignition/modules/linkedMultiQuery";
import AuthV2ValidatorModule from "../../../ignition/modules/authV2Validator";
import EthIdentityValidatorModule from "../../../ignition/modules/ethIdentityValidator";
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
  StateAtModule,
  UniversalVerifierAtModule,
  VCPaymentAtModule,
} from "../../../ignition/modules/contractsAt";
import MCPaymentModule from "../../../ignition/modules/mcPayment";
import VCPaymentModule from "../../../ignition/modules/vcPayment";

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
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();

  const deploymentId = parameters.DeploymentId || undefined;
  // Use the module to get the address into the deployed address registry
  await ignition.deploy(Create2AddressAnchorAtModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  const requestValidators = [
    {
      module: CredentialAtomicQueryMTPV2ValidatorModule,
      moduleAt: CredentialAtomicQueryMTPV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryMTPV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_MTP.unifiedAddress,
      name: contractsInfo.VALIDATOR_MTP.name,
      isProxy: true,
    },
    {
      module: CredentialAtomicQuerySigV2ValidatorModule,
      moduleAt: CredentialAtomicQuerySigV2ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQuerySigV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_SIG.unifiedAddress,
      name: contractsInfo.VALIDATOR_SIG.name,
      isProxy: true,
    },
    {
      module: CredentialAtomicQueryV3ValidatorModule,
      moduleAt: CredentialAtomicQueryV3ValidatorAtModule,
      contractAddress:
        parameters["CredentialAtomicQueryV3ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_V3.unifiedAddress,
      name: contractsInfo.VALIDATOR_V3.name,
      isProxy: true,
    },
    {
      module: LinkedMultiQueryValidatorModule,
      moduleAt: LinkedMultiQueryValidatorAtModule,
      contractAddress:
        parameters["LinkedMultiQueryValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.unifiedAddress,
      name: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      isProxy: true,
    },
  ];

  const authValidators = [
    {
      authMethod: "authV2",
      module: AuthV2ValidatorModule,
      moduleAt: AuthV2ValidatorAtModule,
      contractAddress:
        parameters["AuthV2ValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
      name: contractsInfo.VALIDATOR_AUTH_V2.name,
      isProxy: true,
    },
    {
      authMethod: "ethIdentity",
      module: EthIdentityValidatorModule,
      moduleAt: EthIdentityValidatorAtModule,
      contractAddress:
        parameters["EthIdentityValidatorAtModule"].proxyAddress ||
        contractsInfo.VALIDATOR_ETH_IDENTITY.unifiedAddress,
      name: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      isProxy: true,
    },
  ];

  const contracts = [
    {
      module: StateModule,
      moduleAt: StateAtModule,
      contractAddress:
        parameters["StateAtModule"].proxyAddress || contractsInfo.STATE.unifiedAddress,
      name: contractsInfo.STATE.name,
      isProxy: true,
    },
    {
      module: UniversalVerifierModule,
      moduleAt: UniversalVerifierAtModule,
      contractAddress:
        parameters["UniversalVerifierAtModule"].proxyAddress ||
        contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      name: contractsInfo.UNIVERSAL_VERIFIER.name,
      isProxy: true,
    },
    {
      module: IdentityTreeStoreModule,
      moduleAt: IdentityTreeStoreAtModule,
      contractAddress:
        parameters["IdentityTreeStoreAtModule"].proxyAddress ||
        contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
      name: contractsInfo.IDENTITY_TREE_STORE.name,
      isProxy: true,
    },
    {
      module: VCPaymentModule,
      moduleAt: VCPaymentAtModule,
      contractAddress:
        parameters["VCPaymentAtModule"].proxyAddress || contractsInfo.VC_PAYMENT.unifiedAddress,
      name: contractsInfo.VC_PAYMENT.name,
      isProxy: true,
    },
    {
      module: MCPaymentModule,
      moduleAt: MCPaymentAtModule,
      contractAddress:
        parameters["MCPaymentAtModule"].proxyAddress || contractsInfo.MC_PAYMENT.unifiedAddress,
      name: contractsInfo.MC_PAYMENT.name,
      isProxy: true,
    },
    ...requestValidators,
    ...authValidators,
  ];

  for (const contract of contracts) {
    console.log(`Deploying ${contract.name}...`);
    const deployedContract: any = await ignition.deploy(contract.module, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    console.log(
      `${contract.name} deployed to: ${contract.isProxy ? deployedContract.proxy.target : contract.contractAddress}`,
    );
  }

  // get UniversalVerifier contract
  const universalVerifier = (
    await ignition.deploy(UniversalVerifierAtModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    })
  ).proxy;

  for (const validator of requestValidators) {
    const validatorDeployed = await ignition.deploy(validator.moduleAt, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    if (!(await universalVerifier.isWhitelistedValidator(validatorDeployed.proxy.target))) {
      const tx = await universalVerifier.addValidatorToWhitelist(validatorDeployed.proxy.target);
      await tx.wait();
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
    const validatorDeployed = await ignition.deploy(validator.moduleAt, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });
    if (!(await universalVerifier.authMethodExists(validator.authMethod))) {
      const tx = await universalVerifier.setAuthMethod({
        authMethod: validator.authMethod,
        validator: validatorDeployed.proxy.target,
        params: "0x",
      });
      await tx.wait();
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
