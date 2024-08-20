import { ethers, run, upgrades } from "hardhat";
import { VCPayment, VCPayment__factory } from "../typechain-types";

async function main() {
  const [owner] = await ethers.getSigners();
  const proxy = (await upgrades.deployProxy(new VCPayment__factory(owner))) as unknown as VCPayment;
  await proxy.waitForDeployment();

  console.log(VCPayment__factory.name, " deployed to:", await proxy.getAddress());
  try {
    await run("verify:verify", {
      address: await proxy.getAddress(),
      constructorArguments: [],
    });
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
