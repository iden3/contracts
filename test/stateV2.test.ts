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

  it("should be correct historical proof by time", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

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

  it("should be correct historical proof by block", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

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

  it("should search by block and by time return same root", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);
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

  it("should have correct SMT root transitions info", async () => {
    const roots: any[] = [];
    const expRootInfos: any[] = [];
    for (const issuerStateJson of issuerStateTransitions) {
      const { blockNumber, timestamp } = await publishState(
        state,
        issuerStateJson
      );

      const root = await state.getSmtCurrentRoot();
      roots.push(root);

      if (expRootInfos.length >= 1) {
        expRootInfos[expRootInfos.length - 1].replacedAtTimestamp = timestamp;
        expRootInfos[expRootInfos.length - 1].replacedAtBlock = blockNumber;
        expRootInfos[expRootInfos.length - 1].replacedBy = root;
      }

      expRootInfos.push({
        replacedAtTimestamp: 0,
        createdAtTimestamp: timestamp,
        replacedAtBlock: 0,
        createdAtBlock: blockNumber,
        replacedBy: 0,
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
    expect(rootInfo0.replacedBy).to.equal(expRootInfos[0].replacedBy);

    expect(rootInfo1.replacedAtTimestamp).to.equal(
      expRootInfos[1].replacedAtTimestamp
    );
    expect(rootInfo1.createdAtTimestamp).to.equal(
      expRootInfos[1].createdAtTimestamp
    );
    expect(rootInfo1.replacedAtBlock).to.equal(expRootInfos[1].replacedAtBlock);
    expect(rootInfo1.createdAtBlock).to.equal(expRootInfos[1].createdAtBlock);
    expect(rootInfo1.replacedBy).to.equal(expRootInfos[1].replacedBy);
  });
});
