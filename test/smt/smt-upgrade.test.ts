import { Contract } from "ethers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { publishState } from "../utils/deploy-utils";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";

const issuerStateTransitions = [
  require("../mtp/data/issuer_state_transition.json"),
  require("../mtp/data/issuer_next_state_transition.json"),
];

async function publishInitialState(state: Contract, json) {
  const { id } = await publishState(state, json);
  expect(await state.getSmtRootHistoryLength()).to.equal(1);
  const rootHistory = await state.getSmtRootHistory(0, 0);
  expect(rootHistory[0][0]).to.not.be.null;
  const proof = await state.getSmtProof(id);
  expect(proof.root).to.equal(rootHistory[0].root);
}

describe("Smt Library Upgrade", () => {
  let state: Contract;
  let poseidon1Elements: Contract;
  let poseidon2Elements: Contract;
  let poseidon3Elements: Contract;
  let stateDeployHelper: StateDeployHelper;

  beforeEach(async () => {
    stateDeployHelper = await StateDeployHelper.initialize(null, true);
    const result = await stateDeployHelper.deployStateV2();
    state = result.state;
    poseidon1Elements = result.poseidon1;
    poseidon2Elements = result.poseidon2;
    poseidon3Elements = result.poseidon3;
  });

  it("library upgrade to new version with extending functionality", async () => {
    await publishInitialState(state, issuerStateTransitions[0]);

    //deploy new smt library version
    const smtV2Lib = await stateDeployHelper.deploySmt(
      poseidon1Elements.address,
      poseidon2Elements.address,
      poseidon3Elements.address,
      "SmtV2Mock"
    );

    // upgrade smt library version
    const StateV2Factory = await ethers.getContractFactory("StateV2", {
      libraries: { Smt: smtV2Lib.address },
    });

    // upgrade state to new version
    const newState = await upgrades.upgradeProxy(
      state.address,
      StateV2Factory,
      {
        unsafeAllowLinkedLibraries: true,
      }
    );
    console.log("upgradeProxy tx", newState.address);
    await newState.deployed();

    expect(state.address).to.equal(newState.address);
    expect(await newState.getSmtRootHistoryLength()).to.equal(1);

    const { id: id2 } = await publishState(newState, issuerStateTransitions[1]);
    const history2 = await newState.getSmtRootHistory(1, 1);
    const proof2 = await state.getSmtProof(id2);

    expect(proof2.root).to.equal(history2[0].root);
    expect(await newState.getSmtRootHistoryLength()).to.equal(2);
  });

  it("library upgrade and state upgrade to a new version with extending functionality", async () => {
    // publish state to state v2
    await publishInitialState(state, issuerStateTransitions[0]);

    //deploy new smt library version
    const smtV2Lib = await stateDeployHelper.deploySmt(
      poseidon1Elements.address,
      poseidon2Elements.address,
      poseidon3Elements.address,
      "SmtV2Mock"
    );

    // upgrade smt library version
    const StateV2MockFactory = await ethers.getContractFactory("StateV2Mock", {
      libraries: { SmtV2Mock: smtV2Lib.address },
    });

    // upgrade state to new version
    const newState = await upgrades.upgradeProxy(
      state.address,
      StateV2MockFactory,
      {
        unsafeAllowLinkedLibraries: true,
      }
    );
    console.log("upgradeProxy tx", newState.address);
    await newState.deployed();

    expect(state.address).to.equal(newState.address);
    expect(await newState.getSmtRootHistoryLength()).to.equal(1);

    const { id: id2 } = await publishState(newState, issuerStateTransitions[1]);
    const history2 = await newState.getSmtRootHistory(0, 1);
    const proof2 = await newState.getSmtProof(id2);

    expect(proof2.root).to.equal(history2[1].root);
    expect(proof2.test).to.equal(123);
    expect(await newState.getSmtRootHistoryLength()).to.equal(2);
    expect((await newState.rootHistoryLast()).RootHistory).to.equal(
      history2[1].RootHistory
    );
  });

  it("library struct modification to struct and state upgrade", async () => {
    // publish state to state v2
    await publishInitialState(state, issuerStateTransitions[0]);

    //deploy new smt library version
    const smtV3Lib = await stateDeployHelper.deploySmt(
      poseidon1Elements.address,
      poseidon2Elements.address,
      poseidon3Elements.address,
      "SmtV3Mock"
    );

    // upgrade smt library version
    const StateV3MockFactory = await ethers.getContractFactory("StateV3Mock", {
      libraries: { SmtV3Mock: smtV3Lib.address },
    });

    // upgrade state to new version
    const newState = await upgrades.upgradeProxy(
      state.address,
      StateV3MockFactory,
      {
        unsafeAllowLinkedLibraries: true,
      }
    );
    console.log("upgradeProxy tx", newState.address);
    await newState.deployed();

    expect(state.address).to.equal(newState.address);
    expect(await newState.getSmtRootHistoryLength()).to.equal(1);
    expect(await newState.getSmtRootHistoryLengthV2()).to.equal(0);

    await publishState(newState, issuerStateTransitions[1]);
    expect(await newState.getSmtRootHistoryLength()).to.equal(2);
    expect(await newState.getSmtRootHistoryLengthV2()).to.equal(0);
    await newState.assignHistoryDataToV2();
    expect(await newState.getSmtRootHistoryLengthV2()).to.equal(2);
    await newState.assignTestField(123);
    expect(await newState.getTestField()).to.equal(123);
  });
});
