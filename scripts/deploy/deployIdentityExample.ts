import { getDefaultIdType, getDeploymentParameters } from "../../helpers/helperUtils";
import { ethers, ignition } from "hardhat";
import IdentityExampleModule from "../../ignition/modules/identityExample";

async function main() {
  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();
  parameters.IdentityExampleProxyModule = {
    defaultIdType: (await getDefaultIdType()).defaultIdType,
  };

  const { identityExample } = await ignition.deploy(IdentityExampleModule, {
    strategy: "basic",
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });

  console.log(`IdentityExample deployed to: ${identityExample.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
