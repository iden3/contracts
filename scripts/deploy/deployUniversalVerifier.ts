import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import {
  getConfig,
  getStateContractAddress,
  Logger,
  TempContractDeployments,
  verifyContract,
  waitNotToInterfereWithHardhatIgnition,
} from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const chainId = hre.network.config.chainId;

  const stateContractAddress = getStateContractAddress();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const tmpContractDeployments = new TempContractDeployments(
    "./scripts/deployments_output/temp_deployments_output.json",
  );

  const universalVerifier = await deployHelper.deployUniversalVerifier(
    undefined,
    stateContractAddress,
    deployStrategy,
  );
  tmpContractDeployments.remove();

  await verifyContract(
    await universalVerifier.getAddress(),
    contractsInfo.UNIVERSAL_VERIFIER.verificationOpts,
  );

  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_universal_verifier_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    universalVerifier: await universalVerifier.getAddress(),
    state: stateContractAddress,
    network: networkName,
    chainId,
    deployStrategy,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
