import { DeployHelper } from "../../helpers/DeployHelper";
import { getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployHelper = await DeployHelper.initialize(null, true);

  const { sponsorPayment } = await deployHelper.deploySponsorPayment(
    10,
    60 * 60 * 24, // 1 day unix time
    deployStrategy,
  );

  await verifyContract(
    await sponsorPayment.getAddress(),
    contractsInfo.SPONSOR_PAYMENT.verificationOpts,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
