import fs from "fs";
import path from "path";
import {DeployHelper} from "../helpers/DeployHelper";
import {deployPoseidonFacade} from "../helpers/PoseidonDeployHelper";

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);

  const deployInfo: any = [];
  const contracts = await deployPoseidonFacade();
  deployInfo.push({
    PoseidonFacade: contracts.PoseidonFacade.address,
    PoseidonUnit1L: contracts.PoseidonUnit1L.address,
    PoseidonUnit2L: contracts.PoseidonUnit2L.address,
    PoseidonUnit3L: contracts.PoseidonUnit3L.address,
    PoseidonUnit4L: contracts.PoseidonUnit4L.address,
    PoseidonUnit5L: contracts.PoseidonUnit5L.address,
    PoseidonUnit6L: contracts.PoseidonUnit6L.address,
    SpongePoseidon: contracts.SpongePoseidon.address,
  });
  const outputJson = {
    info: deployInfo,
    network: process.env.HARDHAT_NETWORK,
  };
  const pathOutputJson = path.join(__dirname, "./deploy_poseidon_" + process.env.HARDHAT_NETWORK + ".json");
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
