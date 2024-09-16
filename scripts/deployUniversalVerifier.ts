import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
import hre, { ethers, network } from "hardhat";

async function main() {
  const stateAddress = "0x04C89607413713Ec9775E14b954286519d836FEf";
  if (ethers.isAddress(stateAddress) === false) {
    throw new Error("Invalid state address");
  }
  const deployStrategy: "basic" | "create2" = "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const verifierLib = await deployHelper.deployVerifierLib(deployStrategy);
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
    network: process.env.HARDHAT_NETWORK,
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
