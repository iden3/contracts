import fs from "fs";
import path from "path";
import { deployPoseidonFacade } from "../../helpers/PoseidonDeployHelper";
import { getChainId, getConfig } from "../../helpers/helperUtils";
import hre from "hardhat";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployInfo: any = [];
  const contracts = await deployPoseidonFacade(deployStrategy);
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
  const chainId = await getChainId();
  const networkName = hre.network.name;
  const outputJson = {
    info: deployInfo,
    network: networkName,
    chainId,
    deployStrategy,
  };
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_poseidon_facade_output_${chainId}_${networkName}.json`,
  );
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
