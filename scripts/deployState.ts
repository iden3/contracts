import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
const pathOutputJson = path.join(__dirname, "./deploy_state_output.json");

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);

  const { state, verifier, stateLib, smtLib, poseidon1, poseidon2, poseidon3 } =
    await deployHelper.deployState('VerifierStateTransition', 'create2');

  const outputJson = {
    state: await state.getAddress(),
    verifier: await verifier.getAddress(),
    stateLib: await stateLib.getAddress(),
    smtLib: await smtLib.getAddress(),
    poseidon1: await poseidon1.getAddress(),
    poseidon2: await poseidon2.getAddress(),
    poseidon3: await poseidon3.getAddress(),
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
