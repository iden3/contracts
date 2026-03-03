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
import UpgradeAuthV3ValidatorModule from "../../../ignition/modules/upgrades/upgradeAuthV3Validator";
import UpgradeAuthV3_8_32ValidatorModule from "../../../ignition/modules/upgrades/upgradeAuthV3_8_32Validator";
import UpgradeCredentialAtomicQueryV3StableValidatorModule from "../../../ignition/modules/upgrades/upgradeCredentialAtomicQueryV3StableValidator";
import UpgradeLinkedMultiQueryStableValidatorModule from "../../../ignition/modules/upgrades/upgradeLinkedMultiQueryStable";

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
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_MTP.name],
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts],
      version: contractsInfo.VALIDATOR_MTP.version,
    },
    {
      validatorContractAddress: parameters.CredentialAtomicQuerySigV2ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_SIG.name,
      validatorUpgradeModule: UpgradeCredentialAtomicQuerySigV2ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_SIG.verificationOpts,
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_SIG.name],
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts],
      version: contractsInfo.VALIDATOR_SIG.version,
    },
    {
      validatorContractAddress: parameters.CredentialAtomicQueryV3ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_V3.name,
      validatorUpgradeModule: UpgradeCredentialAtomicQueryV3ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_V3.verificationOpts,
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_V3.name],
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_V3.verificationOpts],
      version: contractsInfo.VALIDATOR_V3.version,
    },
    {
      validatorContractAddress:
        parameters.CredentialAtomicQueryV3StableValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_V3_STABLE.name,
      validatorUpgradeModule: UpgradeCredentialAtomicQueryV3StableValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_V3_STABLE.verificationOpts,
      validatorVerifierNames: [
        contractsInfo.GROTH16_VERIFIER_V3_STABLE.name,
        contractsInfo.GROTH16_VERIFIER_V3_STABLE_16_16_64_16_32.name,
      ],
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_V3_STABLE.verificationOpts,
        contractsInfo.GROTH16_VERIFIER_V3_STABLE_16_16_64_16_32.verificationOpts,
      ],
      version: contractsInfo.VALIDATOR_V3_STABLE.version,
    },
    {
      validatorContractAddress: parameters.LinkedMultiQueryValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      validatorUpgradeModule: UpgradeLinkedMultiQueryValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.verificationOpts,
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name],
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.verificationOpts,
      ],
      version: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.version,
    },
    {
      validatorContractAddress: parameters.LinkedMultiQueryStableValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      validatorUpgradeModule: UpgradeLinkedMultiQueryStableValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.verificationOpts,
      validatorVerifierNames: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.name,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_5.name,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_3.name,
      ],
      verifierVerificationOpts: [
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.verificationOpts,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_5.verificationOpts,
        contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_3.verificationOpts,
      ],
      version: contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.version,
    },
    {
      validatorContractAddress: parameters.AuthV2ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_AUTH_V2.name,
      validatorUpgradeModule: UpgradeAuthV2ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V2.name],
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts],
      version: contractsInfo.VALIDATOR_AUTH_V2.version,
    },
    {
      validatorContractAddress: parameters.AuthV3ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_AUTH_V3.name,
      validatorUpgradeModule: UpgradeAuthV3ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_AUTH_V3.verificationOpts,
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V3.name],
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V3.verificationOpts],
      version: contractsInfo.VALIDATOR_AUTH_V3.version,
    },
    {
      validatorContractAddress: parameters.AuthV3_8_32ValidatorAtModule.proxyAddress,
      validatorContractName: contractsInfo.VALIDATOR_AUTH_V3_8_32.name,
      validatorUpgradeModule: UpgradeAuthV3_8_32ValidatorModule,
      validatorVerificationOpts: contractsInfo.VALIDATOR_AUTH_V3_8_32.verificationOpts,
      validatorVerifierNames: [contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name],
      verifierVerificationOpts: [contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.verificationOpts],
      version: contractsInfo.VALIDATOR_AUTH_V3_8_32.version,
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
      console.log(
        `Contract ${v.validatorContractName} is already upgraded to version ${v.version}`,
      );
      continue;
    } else {
      console.log(
        `Contract ${v.validatorContractName} is not upgraded and will upgrade version ${currentVersion} to ${v.version}`,
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
      console.log(
        `Impersonating Ledger Account by ownership transfer for ${v.validatorContractName}`,
      );
      await transferOwnership(signer, { proxy: proxyAt, proxyAdmin: proxyAdminAt });
    }

    const version = "V".concat(v.version.replaceAll(".", "_").replaceAll("-", "_"));
    parameters["Upgrade".concat(v.validatorContractName).concat("Module").concat(version)] = {
      proxyAddress: parameters[v.validatorContractName.concat("AtModule")].proxyAddress,
      proxyAdminAddress: parameters[v.validatorContractName.concat("AtModule")].proxyAdminAddress,
    };

    const validatorUpgrade = await ignition.deploy(v.validatorUpgradeModule as any, {
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

    if (
      v.validatorVerifierNames &&
      v.validatorVerifierNames.length == 1 &&
      validatorUpgrade.groth16Verifier
    ) {
      parameters[v.validatorVerifierNames[0].concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16Verifier.target,
      };
      console.log(
        `${v.validatorVerifierNames[0]} upgraded to ${validatorUpgrade.groth16Verifier.target}`,
      );
    }

    if (
      v.validatorVerifierNames &&
      validatorUpgrade.groth16VerifierV3Stable &&
      validatorUpgrade.groth16VerifierV3Stable_16_16_64_16_32
    ) {
      parameters[v.validatorVerifierNames[0].concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16VerifierV3Stable.target,
      };
      parameters[v.validatorVerifierNames[1].concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16VerifierV3Stable_16_16_64_16_32.target,
      };
      console.log(
        `${v.validatorVerifierNames[0]} upgraded to: ${validatorUpgrade.groth16VerifierV3Stable.target}`,
      );
      console.log(
        `${v.validatorVerifierNames[1]} upgraded to: ${validatorUpgrade.groth16VerifierV3Stable_16_16_64_16_32.target}`,
      );
    }

    if (
      v.validatorVerifierNames &&
      validatorUpgrade.groth16VerifierLinkedMultiQuery &&
      validatorUpgrade.groth16VerifierLinkedMultiQuery5 &&
      validatorUpgrade.groth16VerifierLinkedMultiQuery3
    ) {
      parameters[v.validatorVerifierNames[0].concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16VerifierLinkedMultiQuery.target,
      };
      parameters[v.validatorVerifierNames[1].concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16VerifierLinkedMultiQuery5.target,
      };
      parameters[v.validatorVerifierNames[2].concat("AtModule")] = {
        contractAddress: validatorUpgrade.groth16VerifierLinkedMultiQuery3.target,
      };
      console.log(
        `${v.validatorVerifierNames[0]} upgraded to: ${validatorUpgrade.groth16VerifierLinkedMultiQuery.target}`,
      );
      console.log(
        `${v.validatorVerifierNames[1]} upgraded to: ${validatorUpgrade.groth16VerifierLinkedMultiQuery5.target}`,
      );
      console.log(
        `${v.validatorVerifierNames[2]} upgraded to: ${validatorUpgrade.groth16VerifierLinkedMultiQuery3.target}`,
      );
    }

    if (v.validatorVerificationOpts) {
      await verifyContract(validatorUpgrade.proxy.target, v.validatorVerificationOpts);
    }
    if (
      v.verifierVerificationOpts &&
      v.verifierVerificationOpts.length == 1 &&
      validatorUpgrade.groth16Verifier
    ) {
      await verifyContract(validatorUpgrade.groth16Verifier.target, v.verifierVerificationOpts[0]);
    }

    if (
      v.verifierVerificationOpts &&
      validatorUpgrade.groth16VerifierV3Stable &&
      validatorUpgrade.groth16VerifierV3Stable_16_16_64_16_32
    ) {
      await verifyContract(
        validatorUpgrade.groth16VerifierV3Stable.target,
        v.verifierVerificationOpts[0],
      );
      await verifyContract(
        validatorUpgrade.groth16VerifierV3Stable_16_16_64_16_32.target,
        v.verifierVerificationOpts[1],
      );
    }

    if (
      v.verifierVerificationOpts &&
      validatorUpgrade.groth16VerifierLinkedMultiQuery &&
      validatorUpgrade.groth16VerifierLinkedMultiQuery5 &&
      validatorUpgrade.groth16VerifierLinkedMultiQuery3
    ) {
      await verifyContract(
        validatorUpgrade.groth16VerifierLinkedMultiQuery.target,
        v.verifierVerificationOpts[0],
      );
      await verifyContract(
        validatorUpgrade.groth16VerifierLinkedMultiQuery5.target,
        v.verifierVerificationOpts[1],
      );
      await verifyContract(
        validatorUpgrade.groth16VerifierLinkedMultiQuery3.target,
        v.verifierVerificationOpts[2],
      );
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
