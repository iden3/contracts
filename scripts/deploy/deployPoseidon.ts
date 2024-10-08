import fs from "fs";
import path from "path";
import { deployPoseidonFacade } from "../../helpers/PoseidonDeployHelper";

async function main() {
  const deployInfo: any = [];
  const contracts = await deployPoseidonFacade();
  deployInfo.push({
    PoseidonFacade: await contracts.PoseidonFacade.getAddress(),
    PoseidonUnit1L: await contracts.PoseidonUnit1L.getAddress(),
    PoseidonUnit2L: await contracts.PoseidonUnit2L.getAddress(),
    PoseidonUnit3L: await contracts.PoseidonUnit3L.getAddress(),
    PoseidonUnit4L: await contracts.PoseidonUnit4L.getAddress(),
    PoseidonUnit5L: await contracts.PoseidonUnit5L.getAddress(),
    PoseidonUnit6L: await contracts.PoseidonUnit6L.getAddress(),
    SpongePoseidon: await contracts.SpongePoseidon.getAddress(),
  });
  const outputJson = {
    info: deployInfo,
    network: process.env.HARDHAT_NETWORK,
  };
  const pathOutputJson = path.join(
    __dirname,
    "./deploy_poseidon_" + process.env.HARDHAT_NETWORK + ".json",
  );
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
