import { DeployHelper } from "../../helpers/DeployHelper";
import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import { ethers, ignition } from "hardhat";
import { VCPaymentProxyModule } from "../../ignition";
import VCPaymentModule from "../../ignition/modules/vcPayment";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  // First implementation
  const { newImplementation, proxyAdmin, proxy } = await ignition.deploy(VCPaymentProxyModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  parameters.VCPaymentAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  // Final implementation
  await ignition.deploy(VCPaymentModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  await verifyContract(proxy.target, contractsInfo.VC_PAYMENT.verificationOpts);

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
