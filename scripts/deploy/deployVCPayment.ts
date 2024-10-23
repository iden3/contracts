import { DeployHelper } from "../../helpers/DeployHelper";
import { getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployHelper = await DeployHelper.initialize(null, true);

  const { vcPayment } = await deployHelper.deployVCPayment(deployStrategy);

  await verifyContract(await vcPayment.getAddress(), contractsInfo.VC_PAYMENT.verificationOpts);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
