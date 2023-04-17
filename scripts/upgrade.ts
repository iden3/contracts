import fs from "fs";
import path from "path";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { StateTestContractMigrationSteps } from "../helpers/MigrationHelper";

const pathOutputJson = path.join(__dirname, "./upgrade_output.json");

async function main() {
  const signers = await ethers.getSigners();
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);
  // const proxyAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

  // const { state, verifier, smtLib, poseidon1, poseidon2, poseidon3 } =
  //   await stateDeployHelper.upgradeToStateV2_migration(proxyAddress);

  // const outputJson = {
  //   state: state.address,
  //   verifier: verifier.address,
  //   smtLib: smtLib.address,
  //   poseidon1: poseidon1.address,
  //   poseidon2: poseidon2.address,
  //   poseidon3: poseidon3.address,
  //   network: process.env.HARDHAT_NETWORK,
  // };
  // fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));

  // const id = BigNumber.from("0x000c91060cf3aa883f1d50203499abcb06a0eedcf1971e15afc88475712b1202");

  // await state.initForMigration(verifier.address);
  // const stateInfosLength = await state.getStateInfoHistoryLengthById(id);
  // const stateInfos = await state.getStateInfoHistoryById(id);
  // console.log("stateInfosLength: ", stateInfosLength);
  // console.log("stateInfos: ", stateInfos);

  // const {
  //   state: stateValue,
  //   createdAtTimestamp: timestamp,
  //   createdAtBlock: blockNumber,
  // } = stateInfos[1];

  // await state.addStateWithTimestampAndBlock(id, stateValue, blockNumber, timestamp);

  // const { state: state2 } = await stateDeployHelper.upgradeToStateV2(proxyAddress);

  // const stateInfoHistoryLengthById = await state2.getStateInfoHistoryLengthById(id);
  // console.log("stateInfoHistoryLengthById: ", stateInfoHistoryLengthById);
  // const stateInfo = await state2.getStateInfoByIdAndState(id, stateValue);
  // console.log("stateInfo: ", stateInfo);
  // const root = await state2.getGISTRoot();
  // console.log("root: ", root);
  // const rootInfo = await state2.getGISTRootInfo(root);
  // console.log("rootInfo: ", rootInfo);

  const migrationSteps = new StateTestContractMigrationSteps(stateDeployHelper, signers[0]);

  const initStateContract = await migrationSteps.getInitContract({
    contractNameOrAbi: require("../helpers/StateV2_0_abi_2_1.json"),
    address: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  });

  const statesWithProofs = [
    require("../test/state/data/user_state_genesis_transition.json"),
    require("../test/validators/common-data/issuer_genesis_state.json"),
    require("../test/validators/common-data/issuer_next_state_transition.json"),
    require("../test/state/data/user_state_next_transition.json"),
  ];
  await migrationSteps.populateData(initStateContract, statesWithProofs);

  console.log("============= Start: upgradeToStateV2_migration =============");
  const { state: stateMigration, verifier } = await stateDeployHelper.upgradeToStateV2_migration(
    initStateContract.address
  );
  console.log("============= Finish: upgradeToStateV2_migration =============");

  console.log("============= Start: initForMigration =============");
  await stateMigration.initForMigration(verifier.address);
  console.log("============= Finish: initForMigration =============");

  const logHistory = await migrationSteps.readEventLogData(initStateContract, 0, 500);
  const genesisStatePublishLog = {};

  const getGenesisState = (stateInfo) => {
    const genesisState = stateInfo.find(
      (info) =>
        info.replacedAtBlock.toString() === "0" && info.replacedAtTimestamp.toString() === "0"
    );

    return genesisState;
  };

  await migrationSteps.migrateData(logHistory, async (args) => {
    const stateInfos = await stateMigration.getStateInfoHistoryById(args.id);
    console.log("stateInfos: ", stateInfos);
    const txs: unknown[] = [];
    if (!genesisStatePublishLog[args.id]) {
      const genesisState = stateInfos.find(
        (info) =>
          info.replacedAtBlock.toString() === "0" && info.replacedAtTimestamp.toString() === "0"
      );
      if (!genesisState) {
        throw new Error("Genesis state not found");
      }
      genesisStatePublishLog[genesisState.id] = true;
      console.log("genesisState: ", genesisState);
      const tx = await stateMigration.addStateWithTimestampAndBlock(
        genesisState.id,
        genesisState.state,
        genesisState.createdAtTimestamp,
        genesisState.createdAtBlock
      );
      console.log("genesisState tx: ", tx.hash);

      txs.push(tx);
    }
    console.log(
      "add regular state from event log",
      args.id.toString(),
      args.state.toString(),
      args.timestamp.toString(),
      args.blockN.toString()
    );

    const tx = await stateMigration.addStateWithTimestampAndBlock(
      args.id,
      args.state,
      args.timestamp,
      args.blockN
    );
    txs.push(tx);

    console.log("stateInfos: ", stateInfos);

    // for (let idx = 0; idx < stateInfos.length; idx++) {
    //   const stateInfo = stateInfos[idx];
    // }

    // const { state, createdAtTimestamp: timestamp, createdAtBlock: blockNumber } = stateInfos[1];
    // return await stateMigration.addStateWithTimestampAndBlock(id, state, timestamp, blockN);
    return txs;
  });

  const { state: statev2 } = await stateDeployHelper.upgradeToStateV2(initStateContract.address);

  // await migrationSteps.
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
