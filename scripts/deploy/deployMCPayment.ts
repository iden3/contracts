import { DeployHelper } from "../../helpers/DeployHelper";
import { getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployHelper = await DeployHelper.initialize(null, true);

  const { mcPayment } = await deployHelper.deployMCPayment(10, deployStrategy);

  await verifyContract(await mcPayment.getAddress(), contractsInfo.MC_PAYMENT.verificationOpts);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
