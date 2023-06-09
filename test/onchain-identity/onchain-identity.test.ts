import { expect } from "chai";
import { ethers, network } from "hardhat";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";

describe("Next tests reproduce identity life cycle", function() {
  this.timeout(10000);

  let identity;
  let latestSavedState;
  let latestComputedState;

  before(async function () {
    const signer = await ethers.getImpersonatedSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    await network.provider.send("hardhat_setBalance", [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x1000000000000000000",
    ]);

    await network.provider.send("hardhat_setNonce", [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0xffffffff0000"
    ]);

    const stDeployHelper = await StateDeployHelper.initialize([signer]);
    const deployHelper = await OnchainIdentityDeployHelper.initialize([signer]);
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
        stContracts.state,
        stContracts.smtLib,
        stContracts.poseidon1,
        stContracts.poseidon2,
        stContracts.poseidon3,
        stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  describe("create identity", function () {
    it("deploy state and identity", async function () {
      expect(await identity.getIsOldStateGenesis()).to.be.equal(
        true
      );
    });

    it("validate identity's id", async function () {
      const id = await identity.getId();

      console.log(identity.address);
      expect(id).to.be.equal(
        16318200065989903207865860093614592605747279308745685922538039864771744258n
      );

      console.log(BigInt(id).toString(16));

    });
  });

  describe("validate initial identity", function () {
    let initialClaimTreeRoot, initialRevocationTreeRoot, initialRootOfRootsTreeRoot: any;
    before(async function () {
      initialClaimTreeRoot = await identity.getClaimsTreeRoot();
      initialRevocationTreeRoot = await identity.getRevocationsTreeRoot();
      initialRootOfRootsTreeRoot = await identity.getRootsTreeRoot();
    });

    it("trees should be empty", async function () {
      expect(initialClaimTreeRoot).be.equal(0);
      expect(initialRevocationTreeRoot).to.be.equal(0);
      expect(initialRootOfRootsTreeRoot).to.be.equal(0);
    });

    it("last roots should be empty", async function () {
      const lastClaimTreeRoot = await identity.getLastClaimsRoot();
      const lastRevocationTreeRoot = await identity.getLastRevocationsRoot();
      const lastRootOfRootsTreeRoot = await identity.getLastRootsRoot();

      expect(lastClaimTreeRoot).to.be.equal(initialClaimTreeRoot);
      expect(lastRevocationTreeRoot).to.be.equal(0);
      expect(lastRootOfRootsTreeRoot).to.be.equal(0);
    });
    it("since the identity did not perform the transition - the isGenesis flag should be true", async function () {
      const isOldStateGenesis = await identity.getIsOldStateGenesis();
      expect(isOldStateGenesis).to.be.true;
    });
    it(
        "latest identity state should be empty",
      async function () {
        latestSavedState = await identity.getIdentityLatestState();
        expect(latestSavedState).to.be.equal(0);
      }
    );
  });

  describe("add claim", function () {
    let initialClaimTreeRoot,
      initialRevocationTreeRoot,
      initialRootOfRootsTreeRoot,
      lastClaimTreeRoot,
      lastRevocationTreeRoot,
      lastRootOfRootsTreeRoot;

    before(async function () {
      initialClaimTreeRoot = await identity.getClaimsTreeRoot();
      initialRevocationTreeRoot = await identity.getRevocationsTreeRoot();
      initialRootOfRootsTreeRoot = await identity.getRootsTreeRoot();

      lastClaimTreeRoot = await identity.getLastClaimsRoot();
      lastRevocationTreeRoot = await identity.getLastRevocationsRoot();
      lastRootOfRootsTreeRoot = await identity.getLastRootsRoot();
      await identity.addClaimHash(1, 2);
    });

    it("we should have proof about claim existing", async function () {
      const proof = await identity.getClaimProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.true;
    });

    it("after insert identity should update only claims tree root", async function () {
      const afterInsertClaimTreeRoot = await identity.getClaimsTreeRoot();
      expect(afterInsertClaimTreeRoot).to.be.not.equal(initialClaimTreeRoot);
    });

    it("another trees should be empty", async function () {
      const afterInsertRevocationTreeRoot = await identity.getRevocationsTreeRoot();
      const afterInsertRootOfRootsTreeRoot = await identity.getRootsTreeRoot();

      expect(afterInsertRevocationTreeRoot).to.be.equal(initialRevocationTreeRoot);
      expect(afterInsertRootOfRootsTreeRoot).to.be.equal(initialRootOfRootsTreeRoot);
    });

    it("latest roots should't be change", async function () {
      const afterInsertLastClaimTreeRoot = await identity.getLastClaimsRoot();
      const afterInsertLastRevocationTreeRoot = await identity.getLastRevocationsRoot();
      const afterInsertLastRootOfRootsTreeRoot = await identity.getLastRootsRoot();
      expect(afterInsertLastClaimTreeRoot).to.be.equal(lastClaimTreeRoot);
      expect(afterInsertLastRevocationTreeRoot).to.be.equal(lastRevocationTreeRoot);
      expect(afterInsertLastRootOfRootsTreeRoot).to.be.equal(lastRootOfRootsTreeRoot);
    });

    it("computes state should be different from latest saved state", async function () {
      latestComputedState = await identity.calcIdentityState();
      latestSavedState = await identity.getIdentityLatestState();
      expect(latestComputedState).to.be.not.equal(latestSavedState);
    });
  });

  describe("make transition", function () {
    let beforeTransitionClaimTreeRoot,
      beforeTransitionRevocationTreeRoot,
      beforeTransitionRootOfRootsTreeRoot;

    before(async function () {
      beforeTransitionClaimTreeRoot = await identity.getLastClaimsRoot();
      beforeTransitionRevocationTreeRoot = await identity.getLastRevocationsRoot();
      beforeTransitionRootOfRootsTreeRoot = await identity.getLastRootsRoot();
      await identity.transitState();
    });

    it("latest roots for ClaimsTree and RootOfRoots should be updated", async function () {
      const afterTransitionClaimTreeRoot = await identity.getLastClaimsRoot();
      expect(afterTransitionClaimTreeRoot).to.be.not.equal(beforeTransitionClaimTreeRoot);
    });
    it("Revocation root should be empty", async function () {
      const afterTransitionRevocationTreeRoot = await identity.getLastRevocationsRoot();
      expect(afterTransitionRevocationTreeRoot).to.be.equal(0);
      expect(afterTransitionRevocationTreeRoot).to.be.equal(beforeTransitionRevocationTreeRoot);
    });

    it("Root of roots and claims root should be updated", async function () {
      const afterTranstionLatestSavedState = await identity.getIdentityLatestState();
      const afterTransitionRootOfRootsTreeRoot = await identity.getLastRootsRoot();

      expect(afterTransitionRootOfRootsTreeRoot).to.be.not.equal(0);
      expect(afterTransitionRootOfRootsTreeRoot).to.be.not.equal(
        beforeTransitionRootOfRootsTreeRoot
      );
      expect(latestSavedState).to.be.not.equal(afterTranstionLatestSavedState);
      latestSavedState = afterTranstionLatestSavedState;
    });
    it("calculatet and saved status should be same", async function () {
      latestComputedState = await identity.calcIdentityState();
      expect(latestComputedState).to.be.equal(latestSavedState);
    });
  });

  describe("revoke state", function () {
    let beforeRevocationClaimTreeRoot,
      beforeRevocationRevocationTreeRoot,
      beforeRevocationRootOfRootsTreeRoot;

    before(async function () {
      beforeRevocationClaimTreeRoot = await identity.getLastClaimsRoot();
      beforeRevocationRevocationTreeRoot = await identity.getLastRevocationsRoot();
      beforeRevocationRootOfRootsTreeRoot = await identity.getLastRootsRoot();
      await identity.revokeClaim(1);
    });

    it("revoced index should exists in Revocation tree", async function () {
      const proof = await identity.getRevocationProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.true;
    });

    it("transit of revocation tree shouldn't update root of roots tree", async function () {
      const beforeRevocationRootOfRootsTreeRoot = await identity.getLastRevocationsRoot();
      expect(beforeRevocationRootOfRootsTreeRoot).to.be.equal(beforeRevocationRevocationTreeRoot);
    });

    it("Root of Roots and Claims Root should be changed", async function () {
      const afterRevocationClaimTreeRoot = await identity.getLastClaimsRoot();
      const afterRevocationRootOfRootsTreeRoot = await identity.getLastRootsRoot();

      expect(afterRevocationClaimTreeRoot).to.be.equal(beforeRevocationClaimTreeRoot);
      expect(afterRevocationRootOfRootsTreeRoot).to.be.equal(beforeRevocationRootOfRootsTreeRoot);
    });
  });

  describe("make transition after revocation", function () {
    let beforeTransitionLatestSavedState;
    before(async function () {
      beforeTransitionLatestSavedState = await identity.getIdentityLatestState();
      await identity.transitState();
    });
    it("state should be updated", async function () {
      const afterTransitionLatestSavedState = await identity.getIdentityLatestState();
      expect(beforeTransitionLatestSavedState).to.be.not.equal(afterTransitionLatestSavedState);
    });
  });
});

describe("Claims tree proofs", () => {
  let identity;
  let targetRoot;

  before(async function () {
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  it("Insert new claim and generate proof", async function () {
    await identity.addClaimHash(1, 2);
    const proof = await identity.getClaimProof(1);
    targetRoot = await identity.getClaimsTreeRoot();
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.true;
    expect(proof.index).to.be.equal(1);
    expect(proof.value).to.be.equal(2);
    expect(proof.auxExistence).to.be.false;
    expect(proof.auxIndex).to.be.equal(0);
    expect(proof.auxValue).to.be.equal(0);
  });

  it("Get proof for claim by root", async function () {
    await identity.addClaimHash(2, 2);

    // using not latest Root
    let proof = await identity.getClaimProofByRoot(2, targetRoot);
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.false;

    // update latest root
    targetRoot = await identity.getClaimsTreeRoot();
    proof = await identity.getClaimProofByRoot(2, targetRoot);
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.true;
    expect(proof.index).to.be.equal(2);
    expect(proof.value).to.be.equal(2);
    expect(proof.auxExistence).to.be.false;
    expect(proof.auxIndex).to.be.equal(0);
    expect(proof.auxValue).to.be.equal(0);
  });
});

describe("Revocation tree proofs", () => {
  let identity;
  let targetRoot;

  before(async function () {
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  it("Insert new record to revocation tree and generate proof", async function () {
    await identity.revokeClaim(1);
    const proof = await identity.getRevocationProof(1);
    targetRoot = await identity.getRevocationsTreeRoot();
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.true;
    expect(proof.index).to.be.equal(1);
    expect(proof.value).to.be.equal(0);
    expect(proof.auxExistence).to.be.false;
    expect(proof.auxIndex).to.be.equal(0);
    expect(proof.auxValue).to.be.equal(0);
  });

  it("Get proof for revocation by root", async function () {
    await identity.revokeClaim(2);

    // using not latest revocation root
    let proof = await identity.getRevocationProofByRoot(2, targetRoot);
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.false;

    // update latest root
    targetRoot = await identity.getRevocationsTreeRoot();
    proof = await identity.getRevocationProofByRoot(2, targetRoot);
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.true;
    expect(proof.index).to.be.equal(2);
    expect(proof.value).to.be.equal(0);
    expect(proof.auxExistence).to.be.false;
    expect(proof.auxIndex).to.be.equal(0);
    expect(proof.auxValue).to.be.equal(0);
  });
});

describe("Root of roots tree proofs", () => {
  let identity;
  let latestRootOfRoots;

  before(async function () {
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  describe("Insert two claims and make transtion state", () => {
    before(async function () {
      await identity.addClaimHash(1, 2);
      await identity.addClaimHash(2, 2);
      await identity.transitState();
    });
    it("Check that root of roots not empty", async function () {
      latestRootOfRoots = await identity.getRootsTreeRoot();
      expect(latestRootOfRoots).to.be.not.equal(0);
    });
  });

  describe("Get current Claims tree root and check that is root exists on Root of Roots tree", () => {
    let currentClaimsTreeRoot;
    before(async function () {
      currentClaimsTreeRoot = await identity.getClaimsTreeRoot();
      await identity.addClaimHash(3, 2);
      await identity.transitState();
    });

    it("Check that Root of Roots tree contains old Claims tee root", async function () {
      const proof = await identity.getRootProof(currentClaimsTreeRoot);
      expect(proof.existence).to.be.true;
    });
  });

  describe("Check historical Claim tree root in claims tree root", () => {
    let currentClaimsTreeRoot, latestRootOfRootsRoot;
    before(async function () {
      latestRootOfRootsRoot = await identity.getLastRootsRoot();
      await identity.addClaimHash(4, 2);
      await identity.transitState();
      currentClaimsTreeRoot = await identity.getClaimsTreeRoot();
    });

    it("Check that Root of Roots tree not contains latest claims tree root", async function () {
      const proof = await identity.getRootProofByRoot(currentClaimsTreeRoot, latestRootOfRootsRoot);
      expect(proof.root).to.be.equal(latestRootOfRootsRoot);
      expect(proof.existence).to.be.false;
    });

    it("Check that current Root of roots contains latest claims tree root", async function () {
      const proof = await identity.getRootProof(currentClaimsTreeRoot);
      expect(proof.existence).to.be.true;
    });
  });
});

describe("Compare historical roots with latest roots from tree", () => {
  let identity;
  let latestState;

  before(async function () {
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  describe("Insert and revoke claims", () => {
    before(async function () {
      await identity.addClaimHash(1, 2);
      await identity.addClaimHash(2, 2);
      await identity.revokeClaim(1);
      await identity.transitState();

      latestState = await identity.getIdentityLatestState();
    });
    it("Compare latest claims tree root", async function () {
      const latestClaimsTreeRoot = await identity.getClaimsTreeRoot();
      const history = await identity.getRootsByState(latestState);

      expect(latestClaimsTreeRoot).to.be.not.equal(0);
      expect(history.claimsRoot).to.be.deep.equal(latestClaimsTreeRoot);
    });
    it("Compare latest revocations tree root", async function () {
      const latestReocationsTreeRoot = await identity.getRevocationsTreeRoot();
      const history = await identity.getRootsByState(latestState);

      expect(latestReocationsTreeRoot).to.be.not.equal(0);
      expect(history.revocationsRoot).to.be.deep.equal(latestReocationsTreeRoot);
    });
    it("Compare latest roots tree root", async function () {
      const latestRootOfRoots = await identity.getRootsTreeRoot();
      const history = await identity.getRootsByState(latestState);

      expect(latestRootOfRoots).to.be.not.equal(0);
      expect(history.rootsRoot).to.be.deep.equal(latestRootOfRoots);
    });
  });
});

describe("Compare historical roots with latest roots from tree", () => {
  let identity, prevState;
  let historyClaimsTreeRoot, historyRevocationsTreeRoot, historyRootsTreeRoot;

  before(async function () {
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  describe("Check prev states", () => {
    before(async function () {
      await identity.addClaimHash(1, 2);
      await identity.revokeClaim(1);
      await identity.transitState();
      prevState = await identity.getIdentityLatestState();
    });
    it("Compare latest claims tree root", async function () {
      const latestClaimsTreeRoot = await identity.getClaimsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestClaimsTreeRoot).to.be.not.equal(0);
      expect(history.claimsRoot).to.be.deep.equal(latestClaimsTreeRoot);
      historyClaimsTreeRoot = latestClaimsTreeRoot;
    });
    it("Compare latest revocations tree root", async function () {
      const latestReocationsTreeRoot = await identity.getRevocationsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestReocationsTreeRoot).to.be.not.equal(0);
      expect(history.revocationsRoot).to.be.deep.equal(latestReocationsTreeRoot);
      historyRevocationsTreeRoot = latestReocationsTreeRoot;
    });
    it("Compare latest roots tree root", async function () {
      const latestRootOfRoots = await identity.getRootsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestRootOfRoots).to.be.not.equal(0);
      expect(history.rootsRoot).to.be.deep.equal(latestRootOfRoots);
      historyRootsTreeRoot = latestRootOfRoots;
    });
  });

  describe("Check next states", () => {
    before(async function () {
      await identity.addClaimHash(2, 2);
      await identity.revokeClaim(2);
      await identity.transitState();
    });
    it("Check historical claims tree root", async function () {
      const latestClaimsTreeRoot = await identity.getClaimsTreeRoot();
      const history = await identity.getRootsByState(prevState);
      expect(latestClaimsTreeRoot).to.be.not.equal(0);
      expect(history.claimsRoot).to.not.deep.equal(latestClaimsTreeRoot);
      expect(history.claimsRoot).to.be.deep.equal(historyClaimsTreeRoot);
    });
    it("Check historical revocations tree root", async function () {
      const latestReocationsTreeRoot = await identity.getRevocationsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestReocationsTreeRoot).to.be.not.equal(0);
      expect(history.revocationsRoot).to.not.deep.equal(latestReocationsTreeRoot);
      expect(history.revocationsRoot).to.be.deep.equal(historyRevocationsTreeRoot);
    });
    it("Check historical roots tree root", async function () {
      const latestRootOfRoots = await identity.getRootsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestRootOfRoots).to.be.not.equal(0);
      expect(history.rootsRoot).to.not.deep.equal(latestRootOfRoots);
      expect(history.rootsRoot).to.be.deep.equal(historyRootsTreeRoot);
    });
  });
});

describe("Genesis state doens't have history of states", () => {
  let identity;

  before(async function () {
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  describe("Empty history map", () => {
    it("Got an error", async function () {
      const latestState = await identity.calcIdentityState();
      try {
        await identity.getRootsByState(latestState);
        expect.fail('The transaction should have thrown an error');
      } catch (err: any) {
        expect(err.reason).to.be.equal("Roots for this state doesn't exist");
      }
    });
  });
});
