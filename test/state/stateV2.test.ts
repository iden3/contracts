import { expect } from "chai";
import { ethers } from "hardhat";
import { publishState } from "../utils/deploy-utils";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";
import bigInt from "big-integer";

const stateTransitions = [
  require("./data/user_state_genesis_transition.json"),
  require("./data/user_state_next_transition.json"),
];

describe("State transitions positive cases", () => {
  let state;

  before(async function () {
    this.timeout(5000);
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Initial state publishing", async function () {
    this.timeout(5000);

    const params = await publishState(state, stateTransitions[0]);

    const res0 = await state.getStateInfoById(params.id);
    expect(res0.state).to.be.equal(bigInt(params.newState).toString());

    expect(await state.stateExists(params.newState)).to.be.equal(true);
    const stInfoNew = await state.getStateInfoByState(params.newState);
    expect(stInfoNew.id).to.be.equal(params.id);
    expect(stInfoNew.replacedByState).to.be.equal(0);
    expect(stInfoNew.createdAtTimestamp).not.be.empty;
    expect(stInfoNew.replacedAtTimestamp).to.be.equal(0);
    expect(stInfoNew.createdAtBlock).not.be.empty;
    expect(stInfoNew.replacedAtBlock).to.be.equal(0);

    expect(await state.stateExists(params.oldState)).to.be.equal(true);
    const stInfoOld = await state.getStateInfoByState(params.oldState);
    expect(stInfoOld.id).to.be.equal(params.id);
    expect(stInfoOld.replacedByState).to.be.equal(params.newState);
    expect(stInfoOld.createdAtTimestamp).to.be.equal(0);
    expect(stInfoOld.replacedAtTimestamp).to.be.equal(
      stInfoNew.createdAtTimestamp
    );
    expect(stInfoOld.createdAtBlock).to.be.equal(0);
    expect(stInfoOld.replacedAtBlock).to.be.equal(stInfoNew.createdAtBlock);

    expect(await state.idExists(params.id)).to.be.equal(true);
    const latestStInfo = await state.getStateInfoById(params.id);
    expect(latestStInfo.state).to.be.equal(params.newState);
  });

  it("Subsequent state update", async function () {
    this.timeout(5000);
    const stateInfoBeforeUpdate = await state.getStateInfoByState(
      stateTransitions[1].pub_signals[1]
    );

    const params = await publishState(state, stateTransitions[1]);
    const res = await state.getStateInfoById(params.id);
    expect(res.state).to.be.equal(params.newState);

    expect(await state.stateExists(params.newState)).to.be.equal(true);
    const stInfoNew = await state.getStateInfoByState(params.newState);
    expect(stInfoNew.replacedAtTimestamp).to.be.equal(0);
    expect(stInfoNew.createdAtTimestamp).not.be.empty;
    expect(stInfoNew.replacedAtBlock).to.be.equal(0);
    expect(stInfoNew.createdAtBlock).not.be.empty;
    expect(stInfoNew.id).to.be.equal(params.id);
    expect(stInfoNew.replacedByState).to.be.equal(0);

    expect(await state.stateExists(params.oldState)).to.be.equal(true);
    const stInfoOld = await state.getStateInfoByState(params.oldState);
    expect(stInfoOld.replacedAtTimestamp).to.be.equal(
      stInfoNew.createdAtTimestamp
    );
    expect(stInfoOld.createdAtTimestamp).to.be.equal(
      stateInfoBeforeUpdate.createdAtTimestamp
    );
    expect(stInfoOld.replacedAtBlock).to.be.equal(stInfoNew.createdAtBlock);
    !expect(stInfoOld.createdAtBlock).to.be.equal(
      stateInfoBeforeUpdate.createdAtBlock
    );
    expect(stInfoOld.id).to.be.equal(params.id);
    expect(stInfoOld.replacedByState).to.be.equal(params.newState);

    expect(await state.idExists(params.id)).to.be.equal(true);
    const latestStInfo = await state.getStateInfoById(params.id);
    expect(latestStInfo.state).to.be.equal(params.newState);
  });
});

describe("State transition negative cases", () => {
  let state;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Old state does not match the latest state", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[1])
    );
    modifiedStateTransition.pub_signals[1] = "1"; // set oldState to 1 to trigger the error

    const expectedErrorText = "Old state does not match the latest state";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);
  });

  it("Old state is genesis but identity already exists", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[1])
    );
    modifiedStateTransition.pub_signals[3] = "1"; // set isOldStateGenesis to 1 to trigger the error

    const expectedErrorText =
      "Old state is genesis but identity already exists";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);
  });

  it("Genesis state already exists", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[0])
    );

    // set id to some random value to trigger the error
    modifiedStateTransition.pub_signals[0] = "1";

    const expectedErrorText = "Genesis state already exists";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      console.log("+++++++++++++++++");
      console.log(e.message);
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);
  });

  it("New state should not exist", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[1])
    );

    // set the new state of identity publishing the same as the existing state
    modifiedStateTransition.pub_signals[2] = stateTransitions[0].pub_signals[1];

    const expectedErrorText = "New state should not exist";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);
  });

  it("Old state is not genesis but identity does not yet exist", async () => {
    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[0])
    );
    modifiedStateTransition.pub_signals[3] = "0"; // change isOldStateGenesis to 0 to trigger exception

    const expectedErrorText =
      "Old state is not genesis but identity does not yet exist";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);
  });

  it("Zero-knowledge proof of state transition is not valid", async () => {
    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[0])
    );
    modifiedStateTransition.pub_signals[2] = "1"; // change state to make zk proof invalid

    const expectedErrorText =
      "Zero-knowledge proof of state transition is not valid";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);
  });
});

describe("State history", function () {
  this.timeout(5000);

  let state;
  let publishedStates: { [key: string]: string | number }[] = [];

  before(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;

    publishedStates = [];
    for (const stateTransition of stateTransitions) {
      publishedStates.push(await publishState(state, stateTransition));
    }
  });

  it("should return state history", async () => {
    const user1Inputs = stateTransitions.slice(0, 2);
    const publishedStates1 = publishedStates.slice(0, 2);

    const id = user1Inputs[0].pub_signals[0];
    const historyLength = await state.getStateInfoHistoryLengthById(id);
    expect(historyLength).to.be.equal(user1Inputs.length + 1);

    const stateInfos = await state.getStateInfoHistoryById(
      id,
      0,
      historyLength
    );
    expect(stateInfos.length).to.be.equal(historyLength);

    const publishedState = publishedStates1[0];
    // genesis state info of the first identity (from the contract)
    const [stateInfo] = await state.getStateInfoHistoryById(id, 0, 1);
    expect(stateInfo.id).to.be.equal(publishedState.id);
    expect(stateInfo.state).to.be.equal(publishedState.oldState);
    expect(stateInfo.replacedByState).to.be.equal(publishedState.newState);
    expect(stateInfo.createdAtTimestamp).to.be.equal(0);
    expect(stateInfo.replacedAtTimestamp).to.be.equal(publishedState.timestamp);
    expect(stateInfo.createdAtBlock).to.be.equal(0);
    expect(stateInfo.replacedAtBlock).to.be.equal(publishedState.blockNumber);

    const publishedState2 = publishedStates1[1];
    // genesis state info of the first identity (from the contract)
    const [stateInfo2] = await state.getStateInfoHistoryById(id, 2, 1);
    console.log(stateInfo2);
    console.log(publishedStates1);
    expect(stateInfo2.id).to.be.equal(publishedState2.id);
    expect(stateInfo2.state).to.be.equal(publishedState2.newState);
    expect(stateInfo2.replacedByState).to.be.equal(0);
    expect(stateInfo2.createdAtTimestamp).to.be.equal(
      publishedState2.timestamp
    );
    expect(stateInfo2.replacedAtTimestamp).to.be.equal(0);
    expect(stateInfo2.createdAtBlock).to.be.equal(publishedState2.blockNumber);
    expect(stateInfo2.replacedAtBlock).to.be.equal(0);
  });

  it("should be reverted if length is zero", async () => {
    const id = stateTransitions[0].pub_signals[0];

    await expect(state.getStateInfoHistoryById(id, 0, 0)).to.be.revertedWith(
      "Length should be greater than 0"
    );
  });

  it("should be reverted if length limit exceeded", async () => {
    const id = stateTransitions[0].pub_signals[0];

    await expect(
      state.getStateInfoHistoryById(id, 0, 10 ** 6)
    ).to.be.revertedWith("History length limit exceeded");
  });

  it("should be reverted if out of bounds", async () => {
    const id = stateTransitions[0].pub_signals[0];

    await expect(state.getStateInfoHistoryById(id, 0, 100)).to.be.revertedWith(
      "Out of bounds of state history"
    );
  });
});

describe("get StateInfo negative cases", function () {
  this.timeout(5000);

  let state;

  before(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;

    for (const stateTransition of stateTransitions) {
      await publishState(state, stateTransition);
    }
  });

  it("getStateInfoByID: should be reverted if identity does not exist", async () => {
    const missingID = stateTransitions[0].pub_signals[0] + 1; // Modify id so it does not exist

    await expect(state.getStateInfoById(missingID)).to.be.revertedWith(
      "Identity does not exist"
    );
  });

  it("getStateInfoHistoryById: should be reverted if identity does not exist", async () => {
    const missingID = stateTransitions[0].pub_signals[0] + 1; // Modify id so it does not exist

    await expect(
      state.getStateInfoHistoryById(missingID, 0, 1)
    ).to.be.revertedWith("Identity does not exist");
  });

  it("getStateInfoHistoryLengthById: should be reverted if identity does not exist", async () => {
    const missingID = stateTransitions[0].pub_signals[0] + 1; // Modify id so it does not exist

    await expect(
      state.getStateInfoHistoryLengthById(missingID)
    ).to.be.revertedWith("Identity does not exist");
  });

  it("getStateInfoByState: should be reverted if state does not exist", async () => {
    const missingState = stateTransitions[0].pub_signals[2] + 1; // Modify state so it does not exist

    await expect(state.getStateInfoByState(missingState)).to.be.revertedWith(
      "State does not exist"
    );
  });
});

describe("GIST proofs", () => {
  let state: any;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Should be correct historical proof by root and the latest root", async function () {
    this.timeout(5000);
    const currentRoots: any[] = [];
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);

    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
      const currentRoot = await state.getGISTRoot();
      const [lastProofRoot] = await state.getGISTProof(id);
      expect(lastProofRoot).to.equal(currentRoot);
      currentRoots.push(currentRoot);
    }

    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(currentRoots.length);

    console.log("root history length: ", rootHistoryLength);
    const [obj1, obj2] = await state.getGISTRootHistory(0, 2);

    const [root] = await state.getGISTProofByRoot(id, obj1.root);
    expect(obj1.root).to.equal(root);
    expect(obj1.root).to.equal(currentRoots[0]);

    const [root2] = await state.getGISTProofByRoot(id, obj2.root);
    expect(obj2.root).to.equal(root2);
    expect(obj2.root).to.equal(currentRoots[1]);
  });

  it("Should be correct historical proof by time", async function () {
    this.timeout(5000);
    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(stateTransitions.length);

    const [root1info, root2info] = await state.getGISTRootHistory(0, 2);

    console.log(root1info);
    const [r1] = await state.getGISTProofByTime(
      id,
      root1info.createdAtTimestamp
    );

    expect(root1info.root).to.equal(r1);

    console.log(root2info);

    const [r2] = await state.getGISTProofByTime(
      id,
      root2info.createdAtTimestamp
    );
    expect(r2).to.equal(root2info.root);
  });

  it("Should be correct historical proof by block", async function () {
    this.timeout(5000);
    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(stateTransitions.length);

    const [root1info, root2info] = await state.getGISTRootHistory(0, 2);

    const [root] = await state.getGISTProofByBlock(
      id,
      root1info.createdAtBlock
    );
    expect(root1info.root).to.equal(root);
    const [root2] = await state.getGISTProofByBlock(
      id,
      root2info.createdAtBlock
    );
    expect(root2info.root).to.equal(root2);
  });
});

describe("GIST root history", () => {
  let state: any;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Should search by block and by time return same root", async function () {
    this.timeout(5000);
    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);
    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(stateTransitions.length);

    const [rootInfo] = await state.getGISTRootHistory(0, 1);

    const [rootB] = await state.getGISTProofByBlock(
      id,
      rootInfo.createdAtBlock
    );
    expect(rootInfo.root).to.equal(rootB);
    const [rootT] = await state.getGISTProofByTime(
      id,
      rootInfo.createdAtTimestamp
    );
    expect(rootInfo.root).to.equal(rootT).to.equal(rootB);
  });

  it("Should have correct GIST root transitions info", async function () {
    this.timeout(5000);
    const roots: any[] = [];
    const expRootInfos: any[] = [];
    for (const issuerStateJson of stateTransitions) {
      const { blockNumber, timestamp } = await publishState(
        state,
        issuerStateJson
      );

      const root = await state.getGISTRoot();
      roots.push(root);

      if (expRootInfos.length >= 1) {
        expRootInfos[expRootInfos.length - 1].replacedAtTimestamp = timestamp;
        expRootInfos[expRootInfos.length - 1].replacedAtBlock = blockNumber;
        expRootInfos[expRootInfos.length - 1].replacedByRoot = root;
      }

      expRootInfos.push({
        replacedAtTimestamp: 0,
        createdAtTimestamp: timestamp,
        replacedAtBlock: 0,
        createdAtBlock: blockNumber,
        replacedByRoot: 0,
      });
    }

    const rootInfo0 = await state.getGISTRootInfo(roots[0]);
    const rootInfo1 = await state.getGISTRootInfo(roots[1]);

    expect(rootInfo0.replacedAtTimestamp).to.equal(
      expRootInfos[0].replacedAtTimestamp
    );
    expect(rootInfo0.createdAtTimestamp).to.equal(
      expRootInfos[0].createdAtTimestamp
    );
    expect(rootInfo0.replacedAtBlock).to.equal(expRootInfos[0].replacedAtBlock);
    expect(rootInfo0.createdAtBlock).to.equal(expRootInfos[0].createdAtBlock);
    expect(rootInfo0.replacedByRoot).to.equal(expRootInfos[0].replacedByRoot);

    expect(rootInfo1.replacedAtTimestamp).to.equal(
      expRootInfos[1].replacedAtTimestamp
    );
    expect(rootInfo1.createdAtTimestamp).to.equal(
      expRootInfos[1].createdAtTimestamp
    );
    expect(rootInfo1.replacedAtBlock).to.equal(expRootInfos[1].replacedAtBlock);
    expect(rootInfo1.createdAtBlock).to.equal(expRootInfos[1].createdAtBlock);
    expect(rootInfo1.replacedByRoot).to.equal(expRootInfos[1].replacedByRoot);
  });
});
