import Create2AddressAnchorModule from "../../ignition/modules/create2AddressAnchor";
import { contractsInfo } from "../../helpers/constants";
import { getDeploymentParameters, writeDeploymentParameters } from "../../helpers/helperUtils";
import { network } from "hardhat";

const { ethers, ignition } = await network.connect();

async function main() {
  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;
  const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
    strategy: "create2",
    defaultSender: await signer.getAddress(),
    deploymentId: deploymentId,
  });

  const contractAddress = await create2AddressAnchor.getAddress();
  if (contractAddress !== contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress) {
    throw Error(
      `The contract was supposed to be deployed to ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}, but it was deployed to ${contractAddress}`,
    );
  }

  console.log(`Create2AddressAnchor deployed to: ${contractAddress}`);
  parameters.Create2AddressAnchorAtModule = { contractAddress: contractAddress };
  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
