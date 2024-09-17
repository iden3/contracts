import { ethers, ignition } from "hardhat";
import { DeterministicAddressAnchorModule } from "../ignition/modules/deterministicAddressAnchor";

async function main() {
  const deployStrategy: "basic" | "create2" = "create2";
  const [signer] = await ethers.getSigners();

  const { deterministicAddressAnchor } = await ignition.deploy(DeterministicAddressAnchorModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
  });

  console.log(
    `DeterministicAddressAnchor deployed to: ${await deterministicAddressAnchor.getAddress()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
