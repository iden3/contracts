import {
  checkContractVersion,
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import UpgradeCredentialAtomicQueryMTPV2ValidatorModule from "../../../ignition/modules/upgrades/upgradeCredentialAtomicQueryMTPV2Validator";
import UpgradeCredentialAtomicQuerySigV2ValidatorModule from "../../../ignition/modules/upgrades/upgradeCredentialAtomicQuerySigV2Validator";
import UpgradeCredentialAtomicQueryV3ValidatorModule from "../../../ignition/modules/upgrades/upgradeCredentialAtomicQueryV3Validator";
import UpgradeAuthV2ValidatorModule from "../../../ignition/modules/upgrades/upgradeAuthV2Validator";
import UpgradeEthIdentityValidatorModule from "../../../ignition/modules/upgrades/upgradeEthIdentityValidator";
import UpgradeLinkedMultiQueryValidatorModule from "../../../ignition/modules/upgrades/upgradeLinkedMultiQuery";
import { transferOwnership } from "../helpers/utils";
import { network } from "hardhat";

const { ethers, ignition } = await network.connect();

// If you want to use impersonation, set the impersonate variable to true
// With ignition we can't use impersonation, so we need to transfer ownership to the signer
// before the upgrade to test in a fork. This is done in the transferOwnership function below.
const impersonate = false;

async function main() {
  const config = getConfig();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }

  const [signer] = await ethers.getSigners();
  console.log("Proxy Admin Owner Address for the upgrade: ", await signer.getAddress());

  // **** Upgrade Validators ****

  // You can select the list of validators you want to upgrade here
  const validators = [
    {
      validatorContractAddress: parameters.CredentialAtomicQueryMTPV2ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_MTP.name,
      validatorUpgradeModule: UpgradeCredentialAtomicQueryMTPV2ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_MTP.verificationOpts,
      validatorVerifierName: contractsInfo.GROTH16_VERIFIER_MTP.name,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts,
      version: contractsInfo.VALIDATOR_MTP.version,
    },
    {
      validatorContractAddress: parameters.CredentialAtomicQuerySigV2ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_SIG.name,
      validatorUpgradeModule: UpgradeCredentialAtomicQuerySigV2ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      validatorVerifierName: contractsInfo.GROTH16_VERIFIER_SIG.name,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts,
      version: contractsInfo.VALIDATOR_SIG.version,
    },
    {
      validatorContractAddress: parameters.CredentialAtomicQueryV3ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_V3.name,
      validatorUpgradeModule: UpgradeCredentialAtomicQueryV3ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      validatorVerifierName: contractsInfo.GROTH16_VERIFIER_V3.name,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_V3.verificationOpts,
      version: contractsInfo.VALIDATOR_V3.version,
    },
    {
      validatorContractAddress: parameters.LinkedMultiQueryValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      validatorUpgradeModule: UpgradeLinkedMultiQueryValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      validatorVerifierName: contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
      verifierVerificationOpts:
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.verificationOpts,
      version: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.version,
    },
    {
      validatorContractAddress: parameters.AuthV2ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_AUTH_V2.name,
      validatorUpgradeModule: UpgradeAuthV2ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      validatorVerifierName: contractsInfo.GROTH16_VERIFIER_AUTH_V2.name,
      verifierVerificationOpts: contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts,
      version: contractsInfo.VALIDATOR_AUTH_V2.version,
    },
    {
      validatorContractAddress: parameters.EthIdentityValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_ETH_IDENTITY.name,
      validatorUpgradeModule: UpgradeEthIdentityValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_ETH_IDENTITY.verificationOpts,
      version: contractsInfo.VALIDATOR_ETH_IDENTITY.version,
    },
  ];

  for (const v of validators) {
    const { upgraded, currentVersion } = await checkContractVersion(
      v.validatorContractName,
      v.validatorContractAddress,
      v.version,
    );

    if (upgraded) {
      console.log(`Contract is already upgraded to version ${v.version}`);
      continue;
    } else {
      console.log(
        `Contract is not upgraded and will upgrade version ${currentVersion} to ${v.version}`,
      );
    }

    const proxyAt = await ethers.getContractAt(
      v.validatorContractName,
      parameters[v.validatorContractName.concat("AtModule")].proxyAddress,
    );
    const proxyAdminAt = await ethers.getContractAt(
      "ProxyAdmin",
      parameters[v.validatorContractName.concat("AtModule")].proxyAdminAddress,
    );

    if (impersonate) {
      console.log("Impersonating Ledger Account by ownership transfer");
      await transferOwnership(signer, { proxy: proxyAt, proxyAdmin: proxyAdminAt });
    }

    const version = "V".concat(v.version.replaceAll(".", "_").replaceAll("-", "_"));
    parameters["Upgrade".concat(v.validatorContractName).concat("Module").concat(version)] = {
      proxyAddress: parameters[v.validatorContractName.concat("AtModule")].proxyAddress,
      proxyAdminAddress: parameters[v.validatorContractName.concat("AtModule")].proxyAdminAddress,
    };

    const validatorUpgrade = await ignition.deploy(v.validatorUpgradeModule, {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    });

    parameters[v.validatorContractName.concat("AtModule")] = {
      proxyAddress: validatorUpgrade.proxy.target,
      proxyAdminAddress: validatorUpgrade.proxyAdmin.target,
    };
    parameters[v.validatorContractName.concat("NewImplementationAtModule")] = {
      contractAddress: validatorUpgrade.newImplementation.target,
    };
    if (v.validatorVerifierName && validatorUpgrade.groth16Verifier) {
      parameters[v.validatorVerifierName.concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16Verifier.target,
      };
      console.log(
        `${v.validatorVerifierName} upgraded to: ${validatorUpgrade.groth16Verifier.target}`,
      );
    }

    if (v.validatorVerificationOpts) {
      await verifyContract(validatorUpgrade.proxy.target, v.validatorVerificationOpts);
    }
    if (v.verifierVerificationOpts && validatorUpgrade.groth16Verifier) {
      await verifyContract(validatorUpgrade.groth16Verifier.target, v.verifierVerificationOpts);
    }
    await verifyContract(validatorUpgrade.newImplementation.target, {
      constructorArgsImplementation: [],
      libraries: {},
    });
  }
  // ************************

  console.log("Validators Contract Upgrade Finished");

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
