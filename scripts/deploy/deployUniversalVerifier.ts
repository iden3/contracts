import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import {
  getConfig,
  Logger,
  TempContractDeployments,
  waitNotToInterfereWithHardhatIgnition,
} from "../../helpers/helperUtils";
import {
  CHAIN_IDS,
  CONTRACT_NAMES,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const chainId = hre.network.config.chainId;

  let stateContractAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
  if (chainId === CHAIN_IDS.POLYGON_AMOY) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === CHAIN_IDS.POLYGON_MAINNET) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
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
    stateContractAddress,
    await verifierLib.getAddress(),
    deployStrategy,
  );
  tmpContractDeployments.remove();
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_universal_verifier_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    universalVerifier: await universalVerifier.getAddress(),
    verifierLib: await verifierLib.getAddress(),
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
