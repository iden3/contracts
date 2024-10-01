import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
import hre, { ethers, network } from "hardhat";
import { getConfig } from "../helpers/helperUtils";

async function main() {
  const config = getConfig();
  const stateAddress = config.stateContractAddress;
  if (!ethers.isAddress(stateAddress)) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set");
  }
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const verifierLib = await deployHelper.deployVerifierLib();
  const universalVerifier = await deployHelper.deployUniversalVerifier(
    undefined,
    stateAddress,
    await verifierLib.getAddress(),
    deployStrategy,
  );

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `./deploy_universal_verifier_output_${chainId}_${networkName}.json`,
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
