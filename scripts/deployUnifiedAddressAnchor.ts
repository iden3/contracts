import { ethers, ignition } from "hardhat";
import { Create2AddressAnchorModule } from "../ignition/modules/crate2AddressAnchor";

async function main() {
  const deployStrategy: "basic" | "create2" = "create2";
  const [signer] = await ethers.getSigners();

  const { create2AddressAnchor } = await ignition.deploy(Create2AddressAnchorModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
  });

  console.log(
    `Create2AddressAnchor deployed to: ${await create2AddressAnchor.getAddress()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
