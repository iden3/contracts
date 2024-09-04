import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
import { ethers } from "hardhat";

const pathOutputJson = path.join(__dirname, "./deploy_universal_verifier_output.json");

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);

  const stateCrossChainAddress = "<put the address here>";
  if (ethers.isAddress(stateCrossChainAddress) === false) {
    throw new Error("Invalid state cross chain address");
  }

  const verifierLib = await deployHelper.deployVerifierLib();

  const universalVerifier = await deployHelper.deployUniversalVerifier(
    undefined,
    stateCrossChainAddress,
    await verifierLib.getAddress(),
  );

  const outputJson = {
    universalVerifier: await universalVerifier.getAddress(),
    network: process.env.HARDHAT_NETWORK,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
