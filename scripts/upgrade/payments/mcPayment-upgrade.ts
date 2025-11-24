import { ethers, ignition } from "hardhat";
import { expect } from "chai"; // abi of contract that will be upgraded
import {
  checkContractVersion,
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { transferOwnership } from "../helpers/utils";
import UpgradeMCPaymentModule from "../../../ignition/modules/upgrades/upgradeMCPayment";

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

  const mcPaymentContractAddress = parameters.MCPaymentAtModule.proxyAddress;
  const [signer] = await ethers.getSigners();

  console.log("Proxy Admin Owner Address for the upgrade: ", signer.address);
  console.log("MC Payment Owner Address for the upgrade: ", signer.address);

  const { upgraded, currentVersion } = await checkContractVersion(
    contractsInfo.MC_PAYMENT.name,
    mcPaymentContractAddress,
    contractsInfo.MC_PAYMENT.version,
  );

  if (upgraded) {
    console.log(`Contract is already upgraded to version ${contractsInfo.MC_PAYMENT.version}`);
    return;
  } else {
    console.log(
      `Contract is not upgraded and will upgrade version ${currentVersion} to ${contractsInfo.MC_PAYMENT.version}`,
    );
  }

  const proxyAt = await ethers.getContractAt(
    contractsInfo.MC_PAYMENT.name,
    parameters.MCPaymentAtModule.proxyAddress,
  );
  const proxyAdminAt = await ethers.getContractAt(
    "ProxyAdmin",
    parameters.MCPaymentAtModule.proxyAdminAddress,
  );

  if (impersonate) {
    console.log("Impersonating Ledger Account by ownership transfer");
    await transferOwnership(signer, { proxy: proxyAt, proxyAdmin: proxyAdminAt });
  }

  const mcPaymentContract = proxyAt;
  console.log("Version before: ", await mcPaymentContract.VERSION());

  const mcPaymentOwnerAddressBefore = await mcPaymentContract.owner();

  const version = "V".concat(
    contractsInfo.MC_PAYMENT.version.replaceAll(".", "_").replaceAll("-", "_"),
  );
  parameters["UpgradeMCPaymentModule".concat(version)] = {
    proxyAddress: parameters.MCPaymentAtModule.proxyAddress,
    proxyAdminAddress: parameters.MCPaymentAtModule.proxyAdminAddress,
  };

  // **** Upgrade MC Payment ****
  const { newImplementation, mcPayment, proxy, proxyAdmin } = await ignition.deploy(
    UpgradeMCPaymentModule,
    {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    },
  );

  parameters.MCPaymentAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  parameters.MCPaymentNewImplementationAtModule = {
    contractAddress: newImplementation.target,
  };
  // ************************

  console.log("Version after: ", await mcPayment.VERSION());

  await verifyContract(proxy.target, contractsInfo.MC_PAYMENT.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  const mcPaymentOwnerAddressAfter = await mcPayment.owner();

  expect(mcPaymentOwnerAddressAfter).to.equal(mcPaymentOwnerAddressBefore);

  console.log("Contract Upgrade Finished");

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
