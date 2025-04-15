import { DeployHelper } from "../../helpers/DeployHelper";
import { getChainId, getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import path from "path";
import hre from "hardhat";
import fs from "fs";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployHelper = await DeployHelper.initialize(null, true);
  const { mcPayment } = await deployHelper.deployMCPayment(15, deployStrategy);
  await verifyContract(await mcPayment.getAddress(), contractsInfo.MC_PAYMENT.verificationOpts);

  const chainId = await getChainId();
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_mc_payment_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    mcPayment: await mcPayment.getAddress(),
    network: networkName,
    chainId: chainId,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
