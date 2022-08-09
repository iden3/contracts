import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  deployContracts,
  deployPoseidons,
  deploySmt,
  publishState,
} from "../deploy-utils";
import { SmtStateMigration } from "../../scripts/smt-state-migration";

const issuerStateTransitions = [
  require("../mtp/data/issuer_state_transition.json"),
  require("../mtp/data/issuer_next_state_transition.json"),
];

describe("State Migration to SMT test", () => {
  let state: any, smt: any;

  beforeEach(async () => {
    const contracts = await deployContracts();
    state = contracts.state;
    smt = contracts.smt;
  });

  it("should history search by time", async () => {
    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    const rootHistoryLength = await smt.rootHistoryLength();

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

    const rootHistoryLength = await smt.rootHistoryLength();

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
    const rootHistoryLength = await smt.rootHistoryLength();
    const [[r1, t1, b1]] = await smt.getRootHistory(0, rootHistoryLength - 1);

    const [rootB] = await state.getHistoricalProofByBlock(id, b1);
    expect(r1).to.equal(rootB);
    const [rootT] = await state.getHistoricalProofByTime(id, t1);
    expect(r1).to.equal(rootT).to.equal(rootB);
  });

  it("should only writer or owner to be able call add to smt tree", async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const { poseidon2Elements, poseidon3Elements } = await deployPoseidons(
      addr1,
      false
    );
    const smt = await deploySmt(
      addr1.address,
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    await expect(smt.add(1, 2)).not.to.be.reverted;
    await expect(smt.connect(addr2).add(1, 2)).to.be.revertedWith(
      "caller has no permissions"
    );
    await expect(smt.connect(addr2).add(1, 3)).to.be.revertedWith(
      "caller has no permissions"
    );

    await expect(smt.connect(owner).add(1, 4)).not.to.be.revertedWith(
      "caller has no permissions"
    );
  });
});

describe("State SMT integration tests", () => {
  it("should upgrade to new state and migrate existing states to smt", async () => {
    // 1. deploy verifier
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();

    // 2. deploy existing state
    const ExistingState = await ethers.getContractFactory("State");
    const existingState = await upgrades.deployProxy(ExistingState, [
      verifier.address,
    ]);
    await existingState.deployed();

    // 2. publish state
    const statesToPublish = [
      require("../mtp/data/issuer_state_transition.json"),
      require("../mtp/data/issuer_next_state_transition.json"),
    ];
    for (const issuerStateJson of statesToPublish) {
      await publishState(existingState, issuerStateJson);
    }

    // 3. upgrade state from mock to state
    const stateContract = await SmtStateMigration.upgradeState(
      existingState.address
    );

    const [owner] = await ethers.getSigners();

    const { poseidon2Elements, poseidon3Elements } = await deployPoseidons(
      owner
    );

    // 4. deploy smt and set smt address to state

    const smt = await deploySmt(
      stateContract.address,
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    await stateContract.setSmt(smt.address);

    // 5. fetch all stateTransition from event
    let stateHistory = await SmtStateMigration.getStateTransitionHistory(
      stateContract,
      0,
      1
    );

    // 6. migrate state
    await SmtStateMigration.migrate(smt, stateHistory);

    // 7. enable state transition
    await stateContract.setTransitionStateEnabled(true);

    // 8. verify smt tree has history
    let rootHistoryLength = await smt.rootHistoryLength();

    let rootHistory = await smt.getRootHistory(0, rootHistoryLength - 1);

    expect(rootHistory.length).to.equal(stateHistory.length);

    // 9. add state transition to migrated state contract
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stateTransition = require("../mtp/data/user_state_transition.json");
    await publishState(stateContract, stateTransition);

    // 10. verify transit state has changed  tree  history
    rootHistoryLength = await smt.rootHistoryLength();

    expect(rootHistoryLength).to.equal(3);

    stateHistory = await SmtStateMigration.getStateTransitionHistory(
      stateContract
    );

    rootHistory = await smt.getRootHistory(0, rootHistoryLength - 1);

    expect(rootHistory.length).to.equal(stateHistory.length);
  });
});
