import { ignition } from "hardhat";
import { getChainId, getConfig, getDeploymentParameters } from "../../helpers/helperUtils";
import UniversalVerifierTestWrapperProxyModule_ManyResponsesPerUserAndRequest from "../../ignition/modules/universalVerifier_ManyResponsesPerUserAndRequest";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const parameters = await getDeploymentParameters();
  const deploymentId = `chain-${await getChainId()}-many-responses-per-user-and-request`;

  const {
    proxyAdmin,
    proxy: universalVerifier,
    verifierLib,
    state,
  } = await ignition.deploy(
    UniversalVerifierTestWrapperProxyModule_ManyResponsesPerUserAndRequest,
    {
      strategy: deployStrategy,
      parameters: parameters,
      deploymentId: deploymentId,
    },
  );

  console.log(`Proxy deployed to: ${universalVerifier.target}`);
  console.log(`ProxyAdmin deployed to: ${proxyAdmin.target}`);
  console.log(`VerifierLib deployed to: ${verifierLib.target}`);
  console.log(`State contract at: ${state.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
