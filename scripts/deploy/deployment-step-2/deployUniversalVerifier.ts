import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import UniversalVerifierModule from "../../../ignition/modules/universalVerifier";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  // Final implementation
  const { universalVerifier } = await ignition.deploy(UniversalVerifierModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${universalVerifier.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
