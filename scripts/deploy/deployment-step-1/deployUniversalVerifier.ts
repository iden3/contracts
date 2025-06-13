import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { UniversalVerifierProxyModule } from "../../../ignition/modules/universalVerifier";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();

  // First implementation
  const { proxyAdmin, proxy, newImplementation } = await ignition.deploy(
    UniversalVerifierProxyModule,
    {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    },
  );

  parameters.UniversalVerifierAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${proxy.target}`);

  await verifyContract(proxy.target, contractsInfo.UNIVERSAL_VERIFIER.verificationOpts);
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
