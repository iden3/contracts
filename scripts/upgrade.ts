import fs from "fs";
import path from "path";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
const pathOutputJson = path.join(__dirname, "./upgrade_output.json");

async function main() {
  const signers = await ethers.getSigners();
  const stateDeployHelper = await StateDeployHelper.initialize(signers, true);

  // const stateMumbaiProxy = await ethers.getContractAt(
  //   "StateV2",
  //   "0x134B1BE34911E39A8397ec6289782989729807a4",
  //   signers[0]
  // );

  // const stateMumbaiAddress = await getImplementationAddress(
  //   stateMumbaiProxy.provider,
  //   stateMumbaiProxy.address
  // );

  // console.log(stateMumbaiAddress);

  const stateMumbaiProxy = await ethers.getContractAt(
    "State",
    "0x134B1BE34911E39A8397ec6289782989729807a4",
    signers[0]
  );

  console.log(stateMumbaiProxy);

  await stateDeployHelper.readEventLogData(stateMumbaiProxy, 31778986, 500);

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
