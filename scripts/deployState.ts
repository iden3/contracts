import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
import hre, { network } from "hardhat";

async function main() {
  const deployStrategy: "basic" | "create2" = "basic";

  const deployHelper = await DeployHelper.initialize(null, true);

  const { state, verifier, stateLib, smtLib, stateCrossChainLib, poseidon1, poseidon2, poseidon3 } =
    await deployHelper.deployState([], "VerifierStateTransition", deployStrategy);

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `./deploy_state_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    state: await state.getAddress(),
    verifier: await verifier.getAddress(),
    stateLib: await stateLib.getAddress(),
    smtLib: await smtLib.getAddress(),
    stateCrossChainLib: await stateCrossChainLib.getAddress(),
    poseidon1: await poseidon1.getAddress(),
    poseidon2: await poseidon2.getAddress(),
    poseidon3: await poseidon3.getAddress(),
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
