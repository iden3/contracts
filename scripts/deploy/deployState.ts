import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDefaultIdType,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import StateModule, { StateProxyModule } from "../../ignition/modules/state";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  parameters.StateProxyFinalImplementationModule.defaultIdType = (
    await getDefaultIdType()
  ).defaultIdType;

  // First implementation
  const { proxy, proxyAdmin, groth16Verifier, stateLib, crossChainProofValidator } =
    await ignition.deploy(StateProxyModule, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    });

  parameters.StateAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  // Final implementation
  await ignition.deploy(StateModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  console.log(`CrossChainProofValidator deployed to: ${crossChainProofValidator.target}`);
  console.log(`Groth16VerifierStateTransition deployed to: ${groth16Verifier.target}`);
  console.log(`StateLib deployed to: ${stateLib.target}`);
  console.log(`State deployed to: ${proxy.target}`);

  // if the state contract already exists we won't have new contracts deployed
  // to verify and to save the output
  if (groth16Verifier && stateLib && crossChainProofValidator) {
    await verifyContract(await proxy.getAddress(), contractsInfo.STATE.verificationOpts);
    await verifyContract(
      await groth16Verifier.getAddress(),
      contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.verificationOpts,
    );
    await verifyContract(await stateLib.getAddress(), contractsInfo.STATE_LIB.verificationOpts);
    await verifyContract(
      await crossChainProofValidator.getAddress(),
      contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.verificationOpts,
    );
  }

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
