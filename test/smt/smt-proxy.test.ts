import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { deployContracts, publishState } from "../mtp/utils";

const issuerStateTransitions = [
  require("../mtp/data/issuer_state_transition.json"),
  require("../mtp/data/issuer_next_state_transition.json"),
];

describe("State SMT integration tests", function () {
  let state: any, smt: any;

  beforeEach(async () => {
    const contracts = await deployContracts();
    state = contracts.state;
    smt = contracts.smt;
  });

  it("should proxy upgrade works", async () => {
    for (const issuerStateJson of [
      require("../mtp/data/issuer_state_transition.json"),
      require("../mtp/data/issuer_next_state_transition.json"),
    ]) {
      await publishState(state, issuerStateJson);
    }

    const rootHistory = await smt.getRootHistory();
    console.log(rootHistory);
    expect(rootHistory.length).to.equal(2);
    const maxDepth = await smt.getMaxDepth();
    console.log(maxDepth);
    expect(maxDepth).to.equal(32);
    // upgrade smt by proxy
    const smtV2Factory = await ethers.getContractFactory("SmtMock");
    console.log(`smt address :  ${smt.address}`);

    const tx = await upgrades.upgradeProxy(smt.address, smtV2Factory);

    console.log("upgrade successfully");
    console.log(tx.deployTransaction);

    const smtV2Contract = smtV2Factory.attach(smt.address);
    const maxDepthV2 = await smtV2Contract.getMaxDepth();
    expect(maxDepthV2).to.equal(64);

    await smtV2Contract.setTestMapValue(1, 2022);

    const value = await smtV2Contract.getTestMapValueById(1);
    expect(value).to.equal(2022);

    const rootHistoryV2 = await smtV2Contract.getRootHistory();
    expect(rootHistoryV2.length).to.equal(2);

    expect(rootHistory).deep.equal(rootHistoryV2);
  });

  it("should history search by time", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const [[r1, t1], [r2, t2]] = await smt.getRootHistory();

    const [root] = await state.getHistoricalProofByTime(id, t1);

    expect(r1).to.equal(root);

    const [root2] = await state.getHistoricalProofByTime(id, t2);
    expect(r2).to.equal(root2);
  });

  it("should history search by block", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const [[r1, , b1], [r2, , b2]] = await smt.getRootHistory();

    const [root] = await state.getHistoricalProofByBlock(id, b1);
    expect(r1).to.equal(root);
    const [root2] = await state.getHistoricalProofByBlock(id, b2);
    expect(r2).to.equal(root2);
  });

  it("should search by block and bu time return same root", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const [[r1, t1, b1]] = await smt.getRootHistory();

    const [rootB] = await state.getHistoricalProofByBlock(id, b1);
    expect(r1).to.equal(rootB);
    const [rootT] = await state.getHistoricalProofByTime(id, t1);
    expect(r1).to.equal(rootT);
    expect(rootB).to.equal(rootT);
  });
});
