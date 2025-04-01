import { ethers, ignition } from "hardhat";
import { Create2AddressAnchorModule } from "../../ignition/modules/crate2AddressAnchor";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const [signer] = await ethers.getSigners();

  const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
    strategy: "create2",
    defaultSender: await signer.getAddress(),
  });

  const contractAddress = await create2AddressAnchor.getAddress();
  if (contractAddress !== contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress) {
    throw Error(
      `The contract was supposed to be deployed to ${contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress}, but it was deployed to ${contractAddress}`,
    );
  }

  console.log(`Create2AddressAnchor deployed to: ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
