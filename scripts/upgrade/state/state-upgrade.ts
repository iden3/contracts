import { ethers, ignition } from "hardhat";
import { expect } from "chai"; // abi of contract that will be upgraded
import {
  checkContractVersion,
  getConfig,
  getDeploymentParameters,
  getStateContractAddress,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import UpgradeStateModule from "../../../ignition/modules/upgrades/upgradeState";
import { transferOwnership } from "../helpers/utils";

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

  const stateContractAddress = parameters.StateAtModule.proxyAddress || getStateContractAddress();
  const [signer] = await ethers.getSigners();

  console.log("Proxy Admin Owner Address for the upgrade: ", signer.address);
  console.log("State Owner Address for the upgrade: ", signer.address);

  const { upgraded, currentVersion } = await checkContractVersion(
    contractsInfo.STATE.name,
    stateContractAddress,
    contractsInfo.STATE.version,
  );

  if (upgraded) {
    console.log(`Contract is already upgraded to version ${contractsInfo.STATE.version}`);
    return;
  } else {
    console.log(
      `Contract is not upgraded and will upgrade version ${currentVersion} to ${contractsInfo.STATE.version}`,
    );
  }

  const proxyAt = await ethers.getContractAt(
    contractsInfo.STATE.name,
    parameters.StateAtModule.proxyAddress,
  );
  const proxyAdminAt = await ethers.getContractAt(
    "ProxyAdmin",
    parameters.StateAtModule.proxyAdminAddress,
  );

  if (impersonate) {
    console.log("Impersonating Ledger Account by ownership transfer");
    await transferOwnership(signer, { proxy: proxyAt, proxyAdmin: proxyAdminAt });
  }

  const stateContract = proxyAt;
  console.log("Version before: ", await stateContract.VERSION());

  const defaultIdTypeBefore = await stateContract.getDefaultIdType();
  const stateOwnerAddressBefore = await stateContract.owner();

  const version = "V".concat(contractsInfo.STATE.version.replaceAll(".", "_").replaceAll("-", "_"));
  parameters["UpgradeStateModule".concat(version)] = {
    proxyAddress: parameters.StateAtModule.proxyAddress,
    proxyAdminAddress: parameters.StateAtModule.proxyAdminAddress,
    oracleSigningAddress: parameters.CrossChainProofValidatorModule.oracleSigningAddress,
    smtLibContractAddress: parameters.SmtLibAtModule.contractAddress,
    poseidon1ContractAddress: parameters.Poseidon1AtModule.contractAddress,
  };

  // **** Upgrade State ****
  const { newImplementation, state, crossChainProofValidator, stateLib, proxy, proxyAdmin } =
    await ignition.deploy(UpgradeStateModule, {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    });

  parameters.StateAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  parameters.StateNewImplementationAtModule = {
    contractAddress: newImplementation.target,
  };
  parameters.CrossChainProofValidatorAtModule = {
    contractAddress: crossChainProofValidator.target,
  };
  parameters.StateLibAtModule = {
    contractAddress: stateLib.target,
  };
  // ************************

  console.log("Version after: ", await state.VERSION());

  await verifyContract(proxy.target, contractsInfo.STATE.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });
  await verifyContract(stateLib.target, contractsInfo.STATE_LIB.verificationOpts);
  await verifyContract(
    await crossChainProofValidator.getAddress(),
    contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.verificationOpts,
  );

  const defaultIdTypeAfter = await state.getDefaultIdType();
  const stateOwnerAddressAfter = await state.owner();

  expect(defaultIdTypeAfter).to.equal(defaultIdTypeBefore);
  expect(stateOwnerAddressAfter).to.equal(stateOwnerAddressBefore);

  const tx1 = await state.setCrossChainProofValidator(crossChainProofValidator.target);
  await tx1.wait();

  console.log("Contract Upgrade Finished");

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
