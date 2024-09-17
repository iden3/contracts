import { ignition, run } from "hardhat";
import { VCPaymentModule } from "../ignition/modules/VCPayment";

async function main() {
  const deployStrategy: "basic" | "create2" = "create2";

  const vcPaymentDeploy = await ignition.deploy(VCPaymentModule, {
    strategy: deployStrategy,
  });

  const { VCPayment } = vcPaymentDeploy;
  await VCPayment.waitForDeployment();
  await VCPayment.initialize();
  console.log("VCPayment deployed to:", await VCPayment.getAddress());

  try {
    await run("verify:verify", {
      address: await VCPayment.getAddress(),
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
