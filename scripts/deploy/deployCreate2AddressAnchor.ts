import { ethers, ignition } from "hardhat";
import { Create2AddressAnchorModule } from "../../ignition/modules/crate2AddressAnchor";
import { create2AddressesInfo } from "../../helpers/constants";

async function main() {
  const deployStrategy: "basic" | "create2" = "create2";
  const [signer] = await ethers.getSigners();

  const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
  });

  const contractAddress = await create2AddressAnchor.getAddress();
  if (deployStrategy === "create2" && contractAddress !== create2AddressesInfo.anchorAddress) {
    throw `The contract was supposed to be deployed to ${create2AddressesInfo.anchorAddress}, but it was deployed to ${contractAddress}`;
  }

  console.log(`Create2AddressAnchor deployed to: ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
