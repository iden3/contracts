import fs from "fs";
import path from "path";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
const pathOutputJson = path.join(__dirname, "./upgrade_output.json");

async function main() {
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);

  const { state, verifier, smtLib, poseidon1, poseidon2, poseidon3 } =
    await stateDeployHelper.upgradeToStateV2_migration("0xa513E6E4b8f2a923D98304ec87F64353C4D5C853");

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

  await state.initForMigration(verifier.address);
  const stateEntriesLength = await state.getStateEntriesLengthById(1);
  const stateEntries = await state.getStateEntriesById(1);
  console.log(stateEntriesLength, stateEntries);

  await state.addStateWithTimestampAndBlock(1, 10, 0, 0);
  await state.addStateWithTimestampAndBlock(1, 10, 1, 1);
  await state.addStateWithTimestampAndBlock(1, 10, 255, 511);

  const { state: state2 } = await stateDeployHelper.upgradeToStateV2("0xa513E6E4b8f2a923D98304ec87F64353C4D5C853");

  const stateInfoHistoryLengthById = await state2.getStateInfoHistoryLengthById(1);
  const stateInfo = await state2.getStateInfoByIdAndState(1, 10);
  const root = await state2.getGISTRoot();
  const rootInfo = await state2.getGISTRootInfo(root);
  console.log(stateInfoHistoryLengthById, stateInfo, root, rootInfo);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
