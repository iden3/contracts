import fs from "fs";
import path from "path";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { StateTestContractMigrationSteps } from "../helpers/MigrationHelper";
import { log } from "console";

const pathOutputJson = path.join(__dirname, "./upgrade_output.json");

async function main() {
  const signers = await ethers.getSigners();
  const stateDeployHelper = await StateDeployHelper.initialize(signers[0], true);
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
  const abi = require("../helpers/StateV2_0_abi_2_1.json");
  const bytecode = fs.readFileSync(path.join(__dirname, "../helpers/StateV2_0_abi_2_1.bytecode"));

  const stateContract = await migrationSteps.getInitContract({
    abi,
    bytecode,
  });

  console.log("stateContract: ", stateContract);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
