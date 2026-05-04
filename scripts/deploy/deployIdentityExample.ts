import { getDefaultIdType, getDeploymentParameters } from "../../helpers/helperUtils";
import IdentityExampleModule from "../../ignition/modules/identityExample";
import { network } from "hardhat";

const { ethers, ignition } = await network.connect();

async function main() {
  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;
  parameters.IdentityExampleProxyModule = {
    defaultIdType: (await getDefaultIdType()).defaultIdType,
  };

  const { identityExample } = await ignition.deploy(IdentityExampleModule, {
    strategy: "basic",
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });

  console.log(`IdentityExample deployed to: ${identityExample.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
