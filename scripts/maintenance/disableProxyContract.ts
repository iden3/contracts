import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { expect } from "chai";
import { network } from "hardhat";
import { getConfig, getDeploymentParameters } from "../../helpers/helperUtils";

const { ethers, ignition, networkName } = await network.connect();

// Put proper contract name here, e.g. contractsInfo.STATE.name
const contractName = "<put-your-contract-name>";

const UpgradeToAlwaysRevertModule = buildModule(
  "UpgradeToAlwaysRevertModule".concat(contractName),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt("TransparentUpgradeableProxy", proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const alwaysRevertImplementation = m.contract("AlwaysRevert");
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, alwaysRevertImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return { alwaysRevertImplementation, proxy, proxyAdmin };
  },
);

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  parameters["UpgradeToAlwaysRevertModule".concat(contractName)] = {
    proxyAddress: parameters[contractName + "AtModule"].proxyAddress,
    proxyAdminAddress: parameters[contractName + "AtModule"].proxyAdminAddress,
  };

  const { proxy } = await ignition.deploy(UpgradeToAlwaysRevertModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  console.log("Waiting 20 seconds after contract deployment and before sanity check...");
  await new Promise((resolve) => setTimeout(resolve, 20000));

  expect(parameters[contractName + "AtModule"].proxyAddress).to.equal(proxy.target);

  // !!!!! Put proper function name here to make some check, e.g. getDefaultIdType() for State contract !!!!!
  const contract = await ethers.getContractAt(contractName, proxy.target);
  await expect(contract.getDefaultIdType()).to.be.revertedWithCustomError(
    contract,
    "TheContractIsDisabled",
  );

  console.log(
    `The contract ${contractName} at ${parameters[contractName + "AtModule"].proxyAddress} on network ${networkName} is disabled`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
