import { run } from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { getConfig } from "../../helpers/helperUtils";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployHelper = await DeployHelper.initialize(null, true);

  const { vcPayment } = await deployHelper.deployVCPayment(deployStrategy);

  try {
    await run("verify:verify", {
      address: await vcPayment.getAddress(),
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
