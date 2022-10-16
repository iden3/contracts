import { expect } from "chai";
import { ethers } from "hardhat";
import { publishState } from "./utils/deploy-utils";
import { StateDeployHelper } from "../helpers/StateDeployHelper";

const issuerStateTransitions = [
  require("./mtp/data/issuer_state_transition.json"),
  require("./mtp/data/issuer_next_state_transition.json"),
];

describe("State Migration to SMT test", () => {
  let state: any;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    state = contracts.state;
  });

  it("should be correct historical proof by root and the latest root", async () => {
    const currentRoots: any[] = [];
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
      const currentRoot = await state.getSmtCurrentRoot();
      const [lastProofRoot] = await state.getSmtProof(id);
      expect(lastProofRoot).to.equal(currentRoot);
      currentRoots.push(currentRoot);
    }

    const rootHistoryLength = await state.getSmtRootHistoryLength();

    const [[r1], [r2]] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    const [root] = await state.getSmtHistoricalProofByRoot(id, r1);
    expect(r1).to.equal(root);
    expect(r1).to.equal(currentRoots[0]);

    const [root2] = await state.getSmtHistoricalProofByRoot(id, r2);
    expect(r2).to.equal(root2);
    expect(r2).to.equal(currentRoots[1]);
  });

  it("should be correct historical proof by time", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await state.getSmtRootHistoryLength();

    const [[r1, t1], [r2, t2]] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    const [root] = await state.getSmtHistoricalProofByTime(id, t1);

    expect(r1).to.equal(root);

    const [root2] = await state.getSmtHistoricalProofByTime(id, t2);
    expect(r2).to.equal(root2);
  });

  it("should be correct historical proof by block", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await state.getSmtRootHistoryLength();

    const [[r1, , b1], [r2, , b2]] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    const [root] = await state.getSmtHistoricalProofByBlock(id, b1);
    expect(r1).to.equal(root);
    const [root2] = await state.getSmtHistoricalProofByBlock(id, b2);
    expect(r2).to.equal(root2);
  });

  it("should search by block and by time return same root", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);
    const rootHistoryLength = await state.getSmtRootHistoryLength();
    const [[r1, t1, b1]] = await state.getSmtRootHistory(
      0,
      rootHistoryLength - 1
    );

    const [rootB] = await state.getSmtHistoricalProofByBlock(id, b1);
    expect(r1).to.equal(rootB);
    const [rootT] = await state.getSmtHistoricalProofByTime(id, t1);
    expect(r1).to.equal(rootT).to.equal(rootB);
  });

  it("should have correct SMT root transitions info", async () => {
    const roots: any[] = [];
    const expRootTrInfo: any[] = [];
    for (const issuerStateJson of issuerStateTransitions) {
      const { blockNumber, timestamp } = await publishState(
        state,
        issuerStateJson
      );

      const root = await state.getSmtCurrentRoot();
      roots.push(root);

      if (expRootTrInfo.length >= 1) {
        expRootTrInfo[expRootTrInfo.length - 1].replacedAtTimestamp = timestamp;
        expRootTrInfo[expRootTrInfo.length - 1].replacedAtBlock = blockNumber;
        expRootTrInfo[expRootTrInfo.length - 1].replacedBy = root;
      }

      expRootTrInfo.push({
        replacedAtTimestamp: 0,
        createdAtTimestamp: timestamp,
        replacedAtBlock: 0,
        createdAtBlock: blockNumber,
        replacedBy: 0,
      });
    }

    const trInfo0 = await state.getSmtRootTransitionsInfo(roots[0]);
    const trInfo1 = await state.getSmtRootTransitionsInfo(roots[1]);

    expect(trInfo0.replacedAtTimestamp).to.equal(
      expRootTrInfo[0].replacedAtTimestamp
    );
    expect(trInfo0.createdAtTimestamp).to.equal(
      expRootTrInfo[0].createdAtTimestamp
    );
    expect(trInfo0.replacedAtBlock).to.equal(expRootTrInfo[0].replacedAtBlock);
    expect(trInfo0.createdAtBlock).to.equal(expRootTrInfo[0].createdAtBlock);
    expect(trInfo0.replacedBy).to.equal(expRootTrInfo[0].replacedBy);

    expect(trInfo1.replacedAtTimestamp).to.equal(
      expRootTrInfo[1].replacedAtTimestamp
    );
    expect(trInfo1.createdAtTimestamp).to.equal(
      expRootTrInfo[1].createdAtTimestamp
    );
    expect(trInfo1.replacedAtBlock).to.equal(expRootTrInfo[1].replacedAtBlock);
    expect(trInfo1.createdAtBlock).to.equal(expRootTrInfo[1].createdAtBlock);
    expect(trInfo1.replacedBy).to.equal(expRootTrInfo[1].replacedBy);
  });
});

describe("State SMT integration tests", function () {
  this.timeout(10000);

  it("should upgrade to new state and migrate existing states to smt", async () => {
    const stateDeployHelper = await StateDeployHelper.initialize();

    // 1. deploy StateV1
    const { state: existingState } = await stateDeployHelper.deployStateV1();

    // 2. publish state
    const statesToPublish = [
      require("./mtp/data/issuer_state_transition.json"),
      require("./mtp/data/issuer_next_state_transition.json"),
    ];
    for (const issuerStateJson of statesToPublish) {
      await publishState(existingState, issuerStateJson);
    }

    // 3. run migration from stateV1 to stateV2
    const { state } = await stateDeployHelper.migrateFromStateV1toV2(
      existingState.address,
      0,
      1
    );

    // 4. verify smt tree has history
    let rootHistoryLength = await state.getSmtRootHistoryLength();
    let rootHistory = await state.getSmtRootHistory(0, rootHistoryLength - 1);
    let stateHistory = await stateDeployHelper.getStateTransitionHistory(
      state,
      0,
      1
    );

    expect(rootHistory.length).to.equal(stateHistory.length);

    // 5. add state transition to migrated state contract
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stateTransition = require("./mtp/data/user_state_transition.json");
    await publishState(state, stateTransition);

    // 6. verify transit state has changed  tree  history
    rootHistoryLength = await state.getSmtRootHistoryLength();

    expect(rootHistoryLength).to.equal(3);

    stateHistory = await stateDeployHelper.getStateTransitionHistory(state);

    rootHistory = await state.getSmtRootHistory(0, rootHistoryLength - 1);

    expect(rootHistory.length).to.equal(stateHistory.length);
  });

  it.skip("estimate tree migration gas", async () => {
    const count = 350;
    const stateDeployHelper = await StateDeployHelper.initialize();

    // 1. deploy existing state
    const { state: existingState } = await stateDeployHelper.deployStateV1();

    const stateContract = await stateDeployHelper.upgradeState(
      existingState.address
    );

    const id = BigInt(
      "279949150130214723420589610911161895495647789006649785264738141299135414272"
    );
    const state = BigInt(
      "179949150130214723420589610911161895495647789006649785264738141299135414272"
    );

    const stateTransitionHistory = new Array(count).fill(0).map((_, index) => {
      return {
        args: [
          id + BigInt(index),
          29831814 + index,
          Math.floor(Date.now() / 1000),
          state + BigInt(index),
        ],
      };
    });

    await stateDeployHelper.migrate(stateContract, stateTransitionHistory);

    const rootHistoryLength = await stateContract.getSmtRootHistoryLength();

    expect(rootHistoryLength).to.equal(count);
  });
});
