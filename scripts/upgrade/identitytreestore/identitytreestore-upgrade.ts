import {
  checkContractVersion,
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { network } from "hardhat";
import UpgradeIdentityTreeStoreModule from "../../../ignition/modules/upgrades/upgradeIdentityTreeStore";
import { transferOwnership } from "../helpers/utils";

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

  const identityTreeStoreContractAddress = parameters.IdentityTreeStoreAtModule.proxyAddress;
  const [signer] = await ethers.getSigners();

  console.log("Proxy Admin Owner Address for the upgrade: ", signer.address);
  console.log("State Owner Address for the upgrade: ", signer.address);

  const { upgraded, currentVersion } = await checkContractVersion(
    contractsInfo.IDENTITY_TREE_STORE.name,
    identityTreeStoreContractAddress,
    contractsInfo.IDENTITY_TREE_STORE.version,
  );

  if (upgraded) {
    console.log(`Contract is already upgraded to version ${contractsInfo.IDENTITY_TREE_STORE.version}`);
    return;
  } else {
    console.log(
      `Contract is not upgraded and will upgrade version ${currentVersion} to ${contractsInfo.IDENTITY_TREE_STORE.version}`,
    );
  }

  const proxyAt = await ethers.getContractAt(
    contractsInfo.IDENTITY_TREE_STORE.name,
    parameters.IdentityTreeStoreAtModule.proxyAddress,
  );
  const proxyAdminAt = await ethers.getContractAt(
    "ProxyAdmin",
    parameters.IdentityTreeStoreAtModule.proxyAdminAddress,
  );

  if (impersonate) {
    console.log("Impersonating Ledger Account by ownership transfer");
    await transferOwnership(signer, { proxy: proxyAt, proxyAdmin: proxyAdminAt });
  }

  const identityTreeStoreContract = proxyAt;

  console.log("Version before:", await identityTreeStoreContract.VERSION());

 const version = "V".concat(contractsInfo.IDENTITY_TREE_STORE.version.replaceAll(".", "_").replaceAll("-", "_"));
  parameters["UpgradeIdentityTreeStoreModule".concat(version)] = {
    proxyAddress: parameters.IdentityTreeStoreAtModule.proxyAddress,
    proxyAdminAddress: parameters.IdentityTreeStoreAtModule.proxyAdminAddress,
    poseidon2ContractAddress: parameters.Poseidon2AtModule.contractAddress,
    poseidon3ContractAddress: parameters.Poseidon3AtModule.contractAddress,
  };

  // **** Upgrade IdentityTreeStore ****


  const { newImplementation, identityTreeStore, proxy, proxyAdmin } =
    await ignition.deploy(UpgradeIdentityTreeStoreModule, {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    });

  parameters.IdentityTreeStoreAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  parameters.IdentityTreeStoreNewImplementationAtModule = {
    contractAddress: newImplementation.target,
  };

  // **********************************
  console.log("Version after:", await identityTreeStore.VERSION());

  await verifyContract(
    await identityTreeStore.getAddress(),
    contractsInfo.IDENTITY_TREE_STORE.verificationOpts,
  );
  console.log("Contract Upgrade Finished");

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
