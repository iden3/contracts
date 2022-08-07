import { poseidonContract } from "circomlibjs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { deployContracts, deploySmt, publishState } from "../deploy-utils";
import { SmtStateMigration } from "../../scripts/smt-state-migration";

const issuerStateTransitions = [
  require("../mtp/data/issuer_state_transition.json"),
  require("../mtp/data/issuer_next_state_transition.json"),
];

describe("State Migration to SMT test", function () {
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

    const rootHistoryLength = await smt.getRootHistoryLength();

    const rootHistory = await smt.getRootHistory(0, rootHistoryLength - 1);

    expect(rootHistory.length).to.equal(2);
    const maxDepth = await smt.getMaxDepth();
    expect(maxDepth).to.equal(32);
    // upgrade smt by proxy
    const smtV2Factory = await ethers.getContractFactory("SmtV2Mock");

    await upgrades.upgradeProxy(smt.address, smtV2Factory);

    const smtV2Contract = smtV2Factory.attach(smt.address);
    const maxDepthV2 = await smtV2Contract.getMaxDepth();
    expect(maxDepthV2).to.equal(64);

    await smtV2Contract.setTestMapValue(1, 2022);

    const value = await smtV2Contract.getTestMapValueById(1);
    expect(value).to.equal(2022);

    const rootHistoryLengthV2 = await smt.getRootHistoryLength();

    const rootHistoryV2 = await smt.getRootHistory(0, rootHistoryLengthV2 - 1);
    expect(rootHistoryV2.length).to.equal(2);

    expect(rootHistory).deep.equal(rootHistoryV2);
  });

  it("should history search by time", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await smt.getRootHistoryLength();

    const [[r1, t1], [r2, t2]] = await smt.getRootHistory(
      0,
      rootHistoryLength - 1
    );

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

    const rootHistoryLength = await smt.getRootHistoryLength();

    const [[r1, , b1], [r2, , b2]] = await smt.getRootHistory(
      0,
      rootHistoryLength - 1
    );

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
    const rootHistoryLength = await smt.getRootHistoryLength();
    const [[r1, t1, b1]] = await smt.getRootHistory(0, rootHistoryLength - 1);

    const [rootB] = await state.getHistoricalProofByBlock(id, b1);
    expect(r1).to.equal(rootB);
    const [rootT] = await state.getHistoricalProofByTime(id, t1);
    expect(r1).to.equal(rootT).to.equal(rootB);
  });

  it("should only writer to be able call add to smt tree", async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const abi = poseidonContract.generateABI(2);
    const code = poseidonContract.createCode(2);
    const Poseidon2Elements = new ethers.ContractFactory(abi, code, owner);
    const poseidon2Elements = await Poseidon2Elements.deploy();
    await poseidon2Elements.deployed();

    const abi3 = poseidonContract.generateABI(3);
    const code3 = poseidonContract.createCode(3);
    const Poseidon3Elements = new ethers.ContractFactory(abi3, code3, owner);
    const poseidon3Elements = await Poseidon3Elements.deploy();
    await poseidon3Elements.deployed();

    const Smt = await ethers.getContractFactory("Smt");
    smt = await upgrades.deployProxy(Smt, [
      poseidon2Elements.address,
      poseidon3Elements.address,
      addr1.address,
    ]);
    await smt.deployed();

    await expect(smt.connect(addr1).add(1, 2)).not.to.be.reverted;
    await expect(smt.connect(addr2).add(1, 2)).to.be.revertedWith(
      "caller has no permissions"
    );
    await expect(smt.add(1, 2)).to.be.revertedWith("caller has no permissions");
  });
});

describe("State SMT integration tests", function () {
  it("should upgrade to new state and migrate existing states to smt", async () => {
    // 1. deploy verifier
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();

    // 2. deploy state mock
    const StateMock = await ethers.getContractFactory("StateV2Mock");
    const stateMock = await upgrades.deployProxy(StateMock, [verifier.address]);
    await stateMock.deployed();

    // 2. publish state to mock
    const statesToPublish = [
      require("../mtp/data/issuer_state_transition.json"),
      require("../mtp/data/issuer_next_state_transition.json"),
    ];
    for (const issuerStateJson of statesToPublish) {
      await publishState(stateMock, issuerStateJson);
    }

    // 3. upgrade state from mock to state
    const stateContract = await SmtStateMigration.upgradeState(
      stateMock.address
    );

    // 4. deploy smt and set smt address to state
    const [owner] = await ethers.getSigners();

    const smt = await deploySmt(owner.address);
    await stateContract.setSmt(smt.address);

    // 5. fetch all stateTransition from event
    const stateHistory = await SmtStateMigration.getStateTransitionHistory(
      stateContract
    );

    // 6. migrate state
    await SmtStateMigration.migrate(smt, stateHistory);

    // 7. check if state is migrated
    const rootHistoryLength = await smt.getRootHistoryLength();

    const rootHistory = await smt.getRootHistory(0, rootHistoryLength - 1);

    expect(rootHistory.length).to.equal(stateHistory.length);
  });
});
