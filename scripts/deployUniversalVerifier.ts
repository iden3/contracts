import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";

const pathOutputJson = path.join(__dirname, "./deploy_universal_verifier_output.json");

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);

  const universalVerifier = await deployHelper.deployUniversalVerifier(undefined, 'create2');

  const outputJson = {
    universalVerifier: universalVerifier,
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
