import { expect } from "chai";
import { ethers } from "hardhat";
import { publishState } from "./utils/deploy-utils";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
import bigInt from "big-integer";

const stateTransitions = [
  require("./mtp/data/issuer_state_transition.json"),
  require("./mtp/data/issuer_next_state_transition.json"),
  require("./mtp/data/user_state_transition.json"),
];

describe("State transitions positive cases", () => {
  let state;

  before(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Initial state publishing", async () => {
    const params = await publishState(state, stateTransitions[0]);

    const res0 = await state.getState(params.id);
    expect(res0.toString()).to.be.equal(bigInt(params.newState).toString());

    const stInfoNew = await state.getStateInfo(params.newState);

    expect(stInfoNew.id).to.be.equal(params.id);
    expect(stInfoNew.replacedByState).to.be.equal(0);
    expect(stInfoNew.createdAtTimestamp).not.be.empty;
    expect(stInfoNew.replacedAtTimestamp).to.be.equal(0);
    expect(stInfoNew.createdAtBlock).not.be.empty;
    expect(stInfoNew.replacedAtBlock).to.be.equal(0);

    const stInfoOld = await state.getStateInfo(params.oldState);

    expect(stInfoOld.id).to.be.equal(params.id);
    expect(stInfoOld.replacedByState).to.be.equal(params.newState);
    expect(stInfoOld.createdAtTimestamp).to.be.equal(0);
    expect(stInfoOld.replacedAtTimestamp).to.be.equal(
      stInfoNew.createdAtTimestamp
    );
    expect(stInfoOld.createdAtBlock).to.be.equal(0);
    expect(stInfoOld.replacedAtBlock).to.be.equal(stInfoNew.createdAtBlock);

    const latestStInfo = await state.getLatestStateInfoById(params.id);
    expect(latestStInfo.state).to.be.equal(params.newState);
  });

  it("Subsequent state update", async () => {
    const stateInfoBeforeUpdate = await state.getStateInfo(
      stateTransitions[1].pub_signals[1]
    );

    const params = await publishState(state, stateTransitions[1]);
    const res = await state.getState(params.id);
    expect(res).to.be.equal(params.newState);

    const stInfoNew = await state.getStateInfo(params.newState);

    expect(stInfoNew.replacedAtTimestamp).to.be.equal(0);
    expect(stInfoNew.createdAtTimestamp).not.be.empty;
    expect(stInfoNew.replacedAtBlock).to.be.equal(0);
    expect(stInfoNew.createdAtBlock).not.be.empty;
    expect(stInfoNew.id).to.be.equal(params.id);
    expect(stInfoNew.replacedByState).to.be.equal(0);

    const stInfoOld = await state.getStateInfo(params.oldState);

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

    const latestStInfo = await state.getLatestStateInfoById(params.id);
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

  it("oldState argument should be equal to the latest identity state in smart contract when isOldStateGenesis == 0", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[1])
    );
    modifiedStateTransition.pub_signals[1] = 1; // set oldState to 1 to trigger the error
    const [id, _, newState] = modifiedStateTransition.pub_signals[0];

    const expectedErrorText =
      "oldState argument should be equal to the latest identity state in smart contract when isOldStateGenesis == 0";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);

    const res = await state.getState(id);
    expect(res).to.not.be.equal(newState);
  });

  it("there should be no states for identity in smart contract when _isOldStateGenesis != 0", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[1])
    );
    modifiedStateTransition.pub_signals[3] = "1"; // set isOldStateGenesis to 1 to trigger the error
    const [id, _, newState] = modifiedStateTransition.pub_signals[1];

    const expectedErrorText =
      "there should be no states for identity in smart contract when _isOldStateGenesis != 0";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);

    const res = await state.getState(id);
    expect(res).to.not.be.equal(newState);
  });

  it("oldState should not exist", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[2])
    );

    // set the oldState of first identity publishing the same as existing state
    modifiedStateTransition.pub_signals[1] = stateTransitions[0].pub_signals[2];
    const [id, _, newState] = modifiedStateTransition.pub_signals[0];

    const expectedErrorText = "oldState should not exist";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);

    const res = await state.getState(id);
    expect(res).to.not.be.equal(newState);
  });

  it("newState should not exist", async () => {
    await publishState(state, stateTransitions[0]);

    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[1])
    );

    // set the new state of identity publishing the same as the existing state
    modifiedStateTransition.pub_signals[2] = stateTransitions[0].pub_signals[1];
    const [id, _, newState] = modifiedStateTransition.pub_signals[0];

    const expectedErrorText = "newState should not exist";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);

    const res = await state.getState(id);
    expect(res).to.not.be.equal(newState);
  });

  it("there should be at least one state for identity in smart contract when _isOldStateGenesis == 0", async () => {
    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[0])
    );
    modifiedStateTransition.pub_signals[3] = "0"; // change isOldStateGenesis to 0 to trigger exception
    const id = modifiedStateTransition.pub_signals[0];

    const expectedErrorText =
      "there should be at least one state for identity in smart contract when _isOldStateGenesis == 0";
    let isException = false;
    try {
      await publishState(state, modifiedStateTransition);
    } catch (e: any) {
      isException = true;
      expect(e.message).contains(expectedErrorText);
    }
    expect(isException).to.equal(true);

    const res = await state.getState(id);
    expect(res.toString()).to.be.equal("0");
  });

  it("zero-knowledge proof of state transition is not valid", async () => {
    const modifiedStateTransition = JSON.parse(
      JSON.stringify(stateTransitions[0])
    );
    modifiedStateTransition.pub_signals[2] = 1; // change state to make zk proof invalid

    const expectedErrorText =
      "zero-knowledge proof of state transition is not valid";
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

describe("SMT proofs", () => {
  let state: any;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Should be correct historical proof by root and the latest root", async () => {
    const currentRoots: any[] = [];
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);

    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
      const currentRoot = await state.getSmtCurrentRoot();
      const [lastProofRoot] = await state.getSmtProof(id);
      expect(lastProofRoot).to.equal(currentRoot);
      currentRoots.push(currentRoot);
    }

    const rootHistoryLength = await state.getSmtRootHistoryLength();

    console.log("root history length: ", rootHistoryLength);
    const [obj1, obj2] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    const [root] = await state.getSmtHistoricalProofByRoot(id, obj1.root);
    expect(obj1.root).to.equal(root);
    expect(obj1.root).to.equal(currentRoots[0]);

    const [root2] = await state.getSmtHistoricalProofByRoot(id, obj2.root);
    expect(obj2.root).to.equal(root2);
    expect(obj2.root).to.equal(currentRoots[1]);
  });

  it("Should be correct historical proof by time", async () => {
    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await state.getSmtRootHistoryLength();

    const [root1info, root2info] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    console.log(root1info);
    const [r1] = await state.getSmtHistoricalProofByTime(
      id,
      root1info.createdAtTimestamp
    );

    expect(root1info.root).to.equal(r1);

    console.log(root2info);

    const [r2] = await state.getSmtHistoricalProofByTime(
      id,
      root2info.createdAtTimestamp
    );
    expect(r2).to.equal(root2info.root);
  });

  it("Should be correct historical proof by block", async () => {
    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await state.getSmtRootHistoryLength();

    const [root1info, root2info] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    const [root] = await state.getSmtHistoricalProofByBlock(
      id,
      root1info.createdAtBlock
    );
    expect(root1info.root).to.equal(root);
    const [root2] = await state.getSmtHistoricalProofByBlock(
      id,
      root2info.createdAtBlock
    );
    expect(root2info.root).to.equal(root2);
  });
});

describe("SMT root history", () => {
  let state: any;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("Should search by block and by time return same root", async () => {
    for (const issuerStateJson of stateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(stateTransitions[0].pub_signals[0]);
    const rootHistoryLength = await state.getSmtRootHistoryLength();
    const [rootInfo] = await state.getSmtRootHistory(0, rootHistoryLength - 1);

    const [rootB] = await state.getSmtHistoricalProofByBlock(
      id,
      rootInfo.createdAtBlock
    );
    expect(rootInfo.root).to.equal(rootB);
    const [rootT] = await state.getSmtHistoricalProofByTime(
      id,
      rootInfo.createdAtTimestamp
    );
    expect(rootInfo.root).to.equal(rootT).to.equal(rootB);
  });

  it("Should have correct SMT root transitions info", async () => {
    const roots: any[] = [];
    const expRootInfos: any[] = [];
    for (const issuerStateJson of stateTransitions) {
      const { blockNumber, timestamp } = await publishState(
        state,
        issuerStateJson
      );

      const root = await state.getSmtCurrentRoot();
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

    const rootInfo0 = await state.getSmtRootInfo(roots[0]);
    const rootInfo1 = await state.getSmtRootInfo(roots[1]);

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
