import { expect } from "chai";
import { ethers } from "hardhat";
import { publishState, publishStateWithStubProof } from "../utils/state-utils";
import { DeployHelper } from "../../helpers/DeployHelper";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const g16VerifierStubName = "Groth16VerifierStub";

const stateTransitionsWithProofs = [
  require("./data/user_state_genesis_transition.json"),
  require("./data/user_state_next_transition.json"),
];

const stateTransitionsWithNoProofs = [
  {
    id: "27421469027114773745011513799725419039783723398312596785118397457757012226",
    oldState: "1099511627776",
    newState: "2199023255552",
    isOldStateGenesis: true,
  },
  {
    id: "27421469027114773745011513799725419039783723398312596785118397457757012226",
    oldState: "2199023255552",
    newState: "3298534883328",
    isOldStateGenesis: false,
  },
];

describe("State transition with real groth16 verifier", () => {
  let state;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    const contracts = await deployHelper.deployStateWithLibraries(["0x0100"]);
    state = contracts.state;
  }

  before(async function () {
    this.timeout(5000);
    await loadFixture(deployContractsFixture);
  });

  it("Zero-knowledge proof of state transition is not valid", async () => {
    const modifiedStateTransition = JSON.parse(JSON.stringify(stateTransitionsWithProofs[0]));
    modifiedStateTransition.pub_signals[2] = "100"; // change state to make zk proof invalid

    await expect(publishState(state, modifiedStateTransition)).to.be.rejectedWith(
      "Zero-knowledge proof of state transition is not valid",
    );
  });

  it("Initial state publishing", async function () {
    this.timeout(5000);

    const params = await publishState(state, stateTransitionsWithProofs[0]);

    const res0 = await state.getStateInfoById(params.id);
    expect(res0.state).to.be.equal(BigInt(params.newState).toString());

    expect(await state.stateExists(params.id, params.newState)).to.be.equal(true);
    const stInfoNew = await state.getStateInfoByIdAndState(params.id, params.newState);
    expect(stInfoNew.id).to.be.equal(params.id);
    expect(stInfoNew.replacedByState).to.be.equal(0);
    expect(stInfoNew.createdAtTimestamp).not.to.be.equal(0);
    expect(stInfoNew.replacedAtTimestamp).to.be.equal(0);
    expect(stInfoNew.createdAtBlock).not.to.be.equal(0);
    expect(stInfoNew.replacedAtBlock).to.be.equal(0);

    expect(await state.stateExists(params.id, params.oldState)).to.be.equal(true);
    const stInfoOld = await state.getStateInfoByIdAndState(params.id, params.oldState);
    expect(stInfoOld.id).to.be.equal(params.id);
    expect(stInfoOld.replacedByState).to.be.equal(params.newState);
    expect(stInfoOld.createdAtTimestamp).to.be.equal(0);
    expect(stInfoOld.replacedAtTimestamp).to.be.equal(stInfoNew.createdAtTimestamp);
    expect(stInfoOld.createdAtBlock).to.be.equal(0);
    expect(stInfoOld.replacedAtBlock).to.be.equal(stInfoNew.createdAtBlock);

    expect(await state.idExists(params.id)).to.be.equal(true);
    const latestStInfo = await state.getStateInfoById(params.id);
    expect(latestStInfo.state).to.be.equal(params.newState);
  });

  it("Subsequent state update", async function () {
    this.timeout(5000);
    const stateInfoBeforeUpdate = await state.getStateInfoByIdAndState(
      stateTransitionsWithProofs[1].pub_signals[0],
      stateTransitionsWithProofs[1].pub_signals[1],
    );

    const params = await publishState(state, stateTransitionsWithProofs[1]);
    const res = await state.getStateInfoById(params.id);
    expect(res.state).to.be.equal(params.newState);

    expect(await state.stateExists(params.id, params.newState)).to.be.equal(true);
    const stInfoNew = await state.getStateInfoByIdAndState(params.id, params.newState);
    expect(stInfoNew.replacedAtTimestamp).to.be.equal(0);
    expect(stInfoNew.createdAtTimestamp).not.be.equal(0);
    expect(stInfoNew.replacedAtBlock).to.be.equal(0);
    expect(stInfoNew.createdAtBlock).not.be.equal(0);
    expect(stInfoNew.id).to.be.equal(params.id);
    expect(stInfoNew.replacedByState).to.be.equal(0);

    expect(await state.stateExists(params.id, params.oldState)).to.be.equal(true);
    const stInfoOld = await state.getStateInfoByIdAndState(params.id, params.oldState);
    expect(stInfoOld.replacedAtTimestamp).to.be.equal(stInfoNew.createdAtTimestamp);
    expect(stInfoOld.createdAtTimestamp).to.be.equal(stateInfoBeforeUpdate.createdAtTimestamp);
    expect(stInfoOld.replacedAtBlock).to.be.equal(stInfoNew.createdAtBlock);
    !expect(stInfoOld.createdAtBlock).to.be.equal(stateInfoBeforeUpdate.createdAtBlock);
    expect(stInfoOld.id).to.be.equal(params.id);
    expect(stInfoOld.replacedByState).to.be.equal(params.newState);

    expect(await state.idExists(params.id)).to.be.equal(true);
    const latestStInfo = await state.getStateInfoById(params.id);
    expect(latestStInfo.state).to.be.equal(params.newState);
  });
});

describe("State transition negative cases", () => {
  let state;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    const contracts = await deployHelper.deployStateWithLibraries(
      ["0x0281", "0x0000"],
      g16VerifierStubName,
    );
    state = contracts.state;
  }
  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("Old state does not match the latest state", async () => {
    await publishStateWithStubProof(state, stateTransitionsWithNoProofs[0]);

    const modifiedStateTransition = JSON.parse(JSON.stringify(stateTransitionsWithNoProofs[1]));
    modifiedStateTransition.oldState = 10;

    await expect(publishStateWithStubProof(state, modifiedStateTransition)).to.be.rejectedWith(
      "Old state does not match the latest state",
    );
  });

  it("Old state is genesis but identity already exists", async () => {
    await publishStateWithStubProof(state, stateTransitionsWithNoProofs[0]);

    const modifiedStateTransition = JSON.parse(JSON.stringify(stateTransitionsWithNoProofs[1]));
    modifiedStateTransition.isOldStateGenesis = true;

    await expect(publishStateWithStubProof(state, modifiedStateTransition)).to.be.rejectedWith(
      "Old state is genesis but identity already exists",
    );
  });

  it("Old state is not genesis but identity does not yet exist", async () => {
    const modifiedStateTransition = JSON.parse(JSON.stringify(stateTransitionsWithNoProofs[0]));
    modifiedStateTransition.isOldStateGenesis = false;

    await expect(publishStateWithStubProof(state, modifiedStateTransition)).to.be.rejectedWith(
      "Old state is not genesis but identity does not yet exist",
    );
  });

  it("ID should not be zero", async () => {
    const modifiedStateTransition = JSON.parse(JSON.stringify(stateTransitionsWithNoProofs[0]));
    modifiedStateTransition.id = 0;

    await expect(publishStateWithStubProof(state, modifiedStateTransition)).to.be.rejectedWith(
      "ID should not be zero",
    );
  });

  it("New state should not be zero", async () => {
    const modifiedStateTransition = JSON.parse(JSON.stringify(stateTransitionsWithNoProofs[0]));
    modifiedStateTransition.newState = 0;

    await expect(publishStateWithStubProof(state, modifiedStateTransition)).to.be.rejectedWith(
      "New state should not be zero",
    );
  });

  it("Should allow only one unique state per identity", async () => {
    await publishStateWithStubProof(state, stateTransitionsWithNoProofs[0]);
    await publishStateWithStubProof(state, stateTransitionsWithNoProofs[1]);

    const stateTransition = {
      id: "27421469027114773745011513799725419039783723398312596785118397457757012226",
      oldState: "3298534883328",
      newState: "2199023255552",
      isOldStateGenesis: false,
    };

    await expect(publishStateWithStubProof(state, stateTransition)).to.be.rejectedWith(
      "New state already exists",
    );
  });
});

describe("StateInfo history", function () {
  let state;
  let publishedStates: { [key: string]: string | number }[] = [];

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    const contracts = await deployHelper.deployStateWithLibraries(["0x0281"], g16VerifierStubName);
    state = contracts.state;

    publishedStates = [];
    for (const stateTransition of stateTransitionsWithNoProofs) {
      publishedStates.push(await publishStateWithStubProof(state, stateTransition));
    }
  }

  before(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("should return state history", async () => {
    const id = stateTransitionsWithNoProofs[0].id;
    const stateHistoryLength = await state.getStateInfoHistoryLengthById(id);

    expect(stateHistoryLength).to.be.equal(stateTransitionsWithNoProofs.length + 1);

    const stateInfos = await state.getStateInfoHistoryById(id, 0, stateHistoryLength);
    expect(stateInfos.length).to.be.equal(stateHistoryLength);

    const publishedState1 = publishedStates[0];
    // genesis state info of the first identity (from the contract)
    const [stateInfo1] = await state.getStateInfoHistoryById(id, 0, 1);
    expect(stateInfo1.id).to.be.equal(publishedState1.id);
    expect(stateInfo1.state).to.be.equal(publishedState1.oldState);
    expect(stateInfo1.replacedByState).to.be.equal(publishedState1.newState);
    expect(stateInfo1.createdAtTimestamp).to.be.equal(0);
    expect(stateInfo1.replacedAtTimestamp).to.be.equal(publishedState1.timestamp);
    expect(stateInfo1.createdAtBlock).to.be.equal(0);
    expect(stateInfo1.replacedAtBlock).to.be.equal(publishedState1.blockNumber);
  });
});

describe("GIST proofs", () => {
  let state: any;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    const contracts = await deployHelper.deployStateWithLibraries(["0x0281"], g16VerifierStubName);
    state = contracts.state;
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("Should be correct historical proof by root and the latest root", async function () {
    const currentRoots: any[] = [];
    const id = stateTransitionsWithNoProofs[0].id;

    for (const issuerStateJson of stateTransitionsWithNoProofs) {
      await publishStateWithStubProof(state, issuerStateJson);
      const currentRoot = await state.getGISTRoot();
      const [lastProofRoot] = await state.getGISTProof(id);
      expect(lastProofRoot).to.equal(currentRoot);
      currentRoots.push(currentRoot);
    }

    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(currentRoots.length + 1);

    const [obj1, obj2] = await state.getGISTRootHistory(1, 2);

    const [root] = await state.getGISTProofByRoot(id, obj1.root);
    expect(obj1.root).to.equal(root);
    expect(obj1.root).to.equal(currentRoots[0]);

    const [root2] = await state.getGISTProofByRoot(id, obj2.root);
    expect(obj2.root).to.equal(root2);
    expect(obj2.root).to.equal(currentRoots[1]);
  });

  it("Should be correct historical proof by time", async function () {
    for (const issuerStateJson of stateTransitionsWithNoProofs) {
      await publishStateWithStubProof(state, issuerStateJson);
    }
    const id = stateTransitionsWithNoProofs[0].id;

    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(stateTransitionsWithNoProofs.length + 1);

    const [root1info, root2info] = await state.getGISTRootHistory(1, 2);

    const [r1] = await state.getGISTProofByTime(id, root1info.createdAtTimestamp);

    expect(root1info.root).to.equal(r1);

    const [r2] = await state.getGISTProofByTime(id, root2info.createdAtTimestamp);
    expect(r2).to.equal(root2info.root);
  });

  it("Should be correct historical proof by block", async function () {
    this.timeout(5000);
    for (const issuerStateJson of stateTransitionsWithNoProofs) {
      await publishStateWithStubProof(state, issuerStateJson);
    }
    const id = stateTransitionsWithNoProofs[0].id;

    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(stateTransitionsWithNoProofs.length + 1);

    const [root1info, root2info] = await state.getGISTRootHistory(1, 2);

    const [root] = await state.getGISTProofByBlock(id, root1info.createdAtBlock);
    expect(root1info.root).to.equal(root);
    const [root2] = await state.getGISTProofByBlock(id, root2info.createdAtBlock);
    expect(root2info.root).to.equal(root2);
  });
});

describe("GIST root history", () => {
  let state: any;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    const contracts = await deployHelper.deployStateWithLibraries(["0x0281"], g16VerifierStubName);
    state = contracts.state;
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("Should search by block and by time return same root", async function () {
    this.timeout(5000);
    for (const issuerStateJson of stateTransitionsWithNoProofs) {
      await publishStateWithStubProof(state, issuerStateJson);
    }
    const id = stateTransitionsWithNoProofs[0].id;
    const rootHistoryLength = await state.getGISTRootHistoryLength();
    expect(rootHistoryLength).to.equal(stateTransitionsWithNoProofs.length + 1);

    const [rootInfo] = await state.getGISTRootHistory(1, 1);

    const [rootB] = await state.getGISTProofByBlock(id, rootInfo.createdAtBlock);
    expect(rootInfo.root).to.equal(rootB);
    const [rootT] = await state.getGISTProofByTime(id, rootInfo.createdAtTimestamp);
    expect(rootInfo.root).to.equal(rootT).to.equal(rootB);
  });

  it("Should have correct GIST root transitions info", async function () {
    this.timeout(5000);
    const roots: any[] = [];
    const expRootInfos: any[] = [];
    for (const issuerStateJson of stateTransitionsWithNoProofs) {
      const { blockNumber, timestamp } = await publishStateWithStubProof(state, issuerStateJson);

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

    expect(rootInfo0.replacedAtTimestamp).to.equal(expRootInfos[0].replacedAtTimestamp);
    expect(rootInfo0.createdAtTimestamp).to.equal(expRootInfos[0].createdAtTimestamp);
    expect(rootInfo0.replacedAtBlock).to.equal(expRootInfos[0].replacedAtBlock);
    expect(rootInfo0.createdAtBlock).to.equal(expRootInfos[0].createdAtBlock);
    expect(rootInfo0.replacedByRoot).to.equal(expRootInfos[0].replacedByRoot);

    expect(rootInfo1.replacedAtTimestamp).to.equal(expRootInfos[1].replacedAtTimestamp);
    expect(rootInfo1.createdAtTimestamp).to.equal(expRootInfos[1].createdAtTimestamp);
    expect(rootInfo1.replacedAtBlock).to.equal(expRootInfos[1].replacedAtBlock);
    expect(rootInfo1.createdAtBlock).to.equal(expRootInfos[1].createdAtBlock);
    expect(rootInfo1.replacedByRoot).to.equal(expRootInfos[1].replacedByRoot);
  });
});

describe("Set Verifier", () => {
  let state: any, groth16verifier: any;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    ({ state, groth16verifier } = await deployHelper.deployStateWithLibraries());
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("Should set groth16 verifier", async () => {
    const verifierAddress = await state.getVerifier();
    expect(verifierAddress).to.equal(await groth16verifier.getAddress());

    const newVerifierAddress = ethers.getAddress("0x8ba1f109551bd432803012645ac136ddd64dba72");
    await state.setVerifier(newVerifierAddress);
    const verifierAddress2 = await state.getVerifier();
    expect(verifierAddress2).to.equal(newVerifierAddress);
  });

  it("Should not set groth16 verifier if not owner", async () => {
    const verifierAddress = await state.getVerifier();
    expect(verifierAddress).to.equal(await groth16verifier.getAddress());

    const notOwner = (await ethers.getSigners())[1];
    const newVerifierAddress = ethers.getAddress("0x8ba1f109551bd432803012645ac136ddd64dba72");
    await expect(state.connect(notOwner).setVerifier(newVerifierAddress)).to.be.rejectedWith(
      "OwnableUnauthorizedAccount",
    );
  });

  it("Should allow groth16 verifier zero address to block any state transition", async () => {
    await state.setVerifier(ethers.ZeroAddress);
    await expect(publishState(state, stateTransitionsWithProofs[0])).to.be.reverted;
  });
});

describe("Check replacedAt timestamp expirations", () => {
  it("Should throw for non-existent state and GIST roots", async function () {
    const deployHelper = await DeployHelper.initialize();
    // default type should be 0x0112
    const { state } = await deployHelper.deployStateWithLibraries([]);

    expect(await state.getGistRootReplacedAt("0x0112", 0)).to.be.equal(0);

    await expect(state.getGistRootReplacedAt("0x0112", 10)).to.be.rejectedWith(
      "GIST root entry not found",
    );

    await expect(state.getGistRootReplacedAt("0x0212", 10)).to.be.rejectedWith(
      "Cross-chain GIST root not found",
    );

    expect(
      await state.getStateReplacedAt(
        BigInt("0xD9C10A0BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE1201"),
        BigInt("0x10A0BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE5E5717281A"),
      ),
    ).to.be.equal(0);

    await expect(
      state.getStateReplacedAt(
        BigInt("0xD9C10A0BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE1201"),
        0,
      ),
    ).to.be.rejectedWith("State entry not found");

    await expect(
      state.getStateReplacedAt(
        BigInt("0xD9C10A0BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE1202"),
        0,
      ),
    ).to.be.rejectedWith("Cross-chain state not found");
  });
});
