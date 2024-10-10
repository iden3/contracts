import { ethers, run, upgrades } from "hardhat";
import { MCPayment, MCPayment__factory } from "../typechain-types";

async function main() {
  const [owner] = await ethers.getSigners();
  const ownerPartPercentage = 10;
  const proxy = (await upgrades.deployProxy(new MCPayment__factory(owner), [
    ownerPartPercentage,
  ])) as unknown as MCPayment;
  await proxy.waitForDeployment();

  console.log(MCPayment__factory.name, " deployed to:", await proxy.getAddress());
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
