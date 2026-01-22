import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import UniversalVerifierModule, {
  UniversalVerifierProxyModule,
} from "../../ignition/modules/universalVerifier";
import { network } from "hardhat";

const { ethers, ignition } = await network.connect();

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  // First implementation
  const { proxy, proxyAdmin, verifierLib } = await ignition.deploy(UniversalVerifierProxyModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  parameters.UniversalVerifierAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  // Final implementation
  await ignition.deploy(UniversalVerifierModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${proxy.target}`);

  await verifyContract(await proxy.getAddress(), contractsInfo.UNIVERSAL_VERIFIER.verificationOpts);
  await verifyContract(await verifierLib.getAddress(), contractsInfo.VERIFIER_LIB.verificationOpts);

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
