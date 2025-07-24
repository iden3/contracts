import { ethers, ignition } from "hardhat";
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

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  // First implementation
  await ignition.deploy(UniversalVerifierProxyModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });
  // Final implementation
  const { proxyAdmin, universalVerifier, verifierLib } = await ignition.deploy(
    UniversalVerifierModule,
    {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    },
  );

  parameters.UniversalVerifierAtModule = {
    proxyAddress: universalVerifier.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${universalVerifier.target}`);

  await verifyContract(
    await universalVerifier.getAddress(),
    contractsInfo.UNIVERSAL_VERIFIER.verificationOpts,
  );

  await verifyContract(await verifierLib.getAddress(), contractsInfo.VERIFIER_LIB.verificationOpts);

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
