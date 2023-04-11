import fs from "fs";
import path from "path";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
const pathOutputJson = path.join(__dirname, "./deploy_output.json");

async function main() {
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);

  const { state, verifier, smtLib, poseidon1, poseidon2, poseidon3 } =
    await stateDeployHelper.deployStateV2();

  const outputJson = {
    state: state.address,
    verifier: verifier.address,
    smtLib: smtLib.address,
    poseidon1: poseidon1.address,
    poseidon2: poseidon2.address,
    poseidon3: poseidon3.address,
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
