import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import { ethers, ignition } from "hardhat";
import { MCPaymentProxyModule } from "../../ignition";
import MCPaymentModule from "../../ignition/modules/mcPayment";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  // First implementation
  const { proxy, proxyAdmin, newImplementation } = await ignition.deploy(MCPaymentProxyModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  parameters.MCPaymentAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  // Final implementation
  await ignition.deploy(MCPaymentModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  await verifyContract(proxy.target, contractsInfo.MC_PAYMENT.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
