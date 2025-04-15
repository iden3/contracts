import fs from "fs";
import path from "path";
import { getChainId, getConfig, verifyContract } from "../../helpers/helperUtils";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre from "hardhat";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const deployHelper = await DeployHelper.initialize(null, true);

  const [poseidon1Elements, poseidon2Elements, poseidon3Elements, poseidon4Elements] =
    await deployPoseidons([1, 2, 3, 4], deployStrategy);

  const smtLib = await deployHelper.deploySmtLib(
    await poseidon2Elements.getAddress(),
    await poseidon3Elements.getAddress(),
    contractsInfo.SMT_LIB.name,
    deployStrategy,
  );

  await verifyContract(await smtLib.getAddress(), contractsInfo.SMT_LIB.verificationOpts);

  const chainId = await getChainId();
  const networkName = hre.network.name;
  const outputJson = {
    poseidon1: await poseidon1Elements.getAddress(),
    poseidon2: await poseidon2Elements.getAddress(),
    poseidon3: await poseidon3Elements.getAddress(),
    poseidon4: await poseidon4Elements.getAddress(),
    smtLib: await smtLib.getAddress(),
    network: networkName,
    chainId,
    deployStrategy,
  };

  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_libraries_output_${chainId}_${networkName}.json`,
  );
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
