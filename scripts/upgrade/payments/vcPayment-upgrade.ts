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
import UpgradeVCPaymentModule from "../../../ignition/modules/upgrades/upgradeVCPayment";
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

  const vcPaymentContractAddress = parameters.VCPaymentAtModule.proxyAddress;
  const [signer] = await ethers.getSigners();

  console.log("Proxy Admin Owner Address for the upgrade: ", signer.address);
  console.log("VC Payment Owner Address for the upgrade: ", signer.address);

  const { upgraded, currentVersion } = await checkContractVersion(
    contractsInfo.VC_PAYMENT.name,
    vcPaymentContractAddress,
    contractsInfo.VC_PAYMENT.version,
  );

  if (upgraded) {
    console.log(`Contract is already upgraded to version ${contractsInfo.VC_PAYMENT.version}`);
    return;
  } else {
    console.log(
      `Contract is not upgraded and will upgrade version ${currentVersion} to ${contractsInfo.VC_PAYMENT.version}`,
    );
  }

  const proxyAt = await ethers.getContractAt(
    contractsInfo.VC_PAYMENT.name,
    parameters.VCPaymentAtModule.proxyAddress,
  );
  const proxyAdminAt = await ethers.getContractAt(
    "ProxyAdmin",
    parameters.VCPaymentAtModule.proxyAdminAddress,
  );

  if (impersonate) {
    console.log("Impersonating Ledger Account by ownership transfer");
    await transferOwnership(signer, { proxy: proxyAt, proxyAdmin: proxyAdminAt });
  }

  const vcPaymentContract = proxyAt;
  console.log("Version before: ", await vcPaymentContract.VERSION());

  const vcPaymentOwnerAddressBefore = await vcPaymentContract.owner();

  const version = "V".concat(
    contractsInfo.VC_PAYMENT.version.replaceAll(".", "_").replaceAll("-", "_"),
  );
  parameters["UpgradeVCPaymentModule".concat(version)] = {
    proxyAddress: parameters.VCPaymentAtModule.proxyAddress,
    proxyAdminAddress: parameters.VCPaymentAtModule.proxyAdminAddress,
  };

  // **** Upgrade VC Payment ****
  const { newImplementation, vcPayment, proxy, proxyAdmin } = await ignition.deploy(
    UpgradeVCPaymentModule,
    {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    },
  );

  parameters.VCPaymentAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  parameters.VCPaymentNewImplementationAtModule = {
    contractAddress: newImplementation.target,
  };
  // ************************

  console.log("Version after: ", await vcPayment.VERSION());

  await verifyContract(proxy.target, contractsInfo.VC_PAYMENT.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  const vcPaymentOwnerAddressAfter = await vcPayment.owner();

  expect(vcPaymentOwnerAddressAfter).to.equal(vcPaymentOwnerAddressBefore);

  console.log("Contract Upgrade Finished");

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
