import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { ethers, network } from "hardhat";
import {
  getConfig,
  Logger,
  TempContractDeployments,
  waitNotToInterfereWithHardhatIgnition,
} from "../../helpers/helperUtils";
import { isContract } from "../../helpers/helperUtils";
import { CONTRACT_NAMES } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const stateAddress = config.stateContractAddress;
  if (!(await isContract(stateAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
  }
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const tmpContractDeployments = new TempContractDeployments(
    "./scripts/deployments_output/temp_deployments_output.json",
  );

  let verifierLib = await tmpContractDeployments.getContract(CONTRACT_NAMES.VERIFIER_LIB);
  if (verifierLib) {
    Logger.warning(
      `${CONTRACT_NAMES.VERIFIER_LIB} found already deployed to:  ${await verifierLib?.getAddress()}`,
    );
  } else {
    verifierLib = await deployHelper.deployVerifierLib();
    const tx = await verifierLib.deploymentTransaction();
    await waitNotToInterfereWithHardhatIgnition(tx);
    tmpContractDeployments.addContract(CONTRACT_NAMES.VERIFIER_LIB, await verifierLib.getAddress());
  }

  const universalVerifier = await deployHelper.deployUniversalVerifier(
    undefined,
    stateAddress,
    await verifierLib.getAddress(),
    deployStrategy,
  );
  tmpContractDeployments.remove();
  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_universal_verifier_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    universalVerifier: await universalVerifier.getAddress(),
    verifierLib: await verifierLib.getAddress(),
    state: stateAddress,
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
