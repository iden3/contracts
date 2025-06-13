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

  // Final implementation
  const { proxyAdmin, universalVerifier } = await ignition.deploy(UniversalVerifierModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });

  parameters.UniversalVerifierAtModule = {
    proxyAddress: universalVerifier.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${universalVerifier.target}`);

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
