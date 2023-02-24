import { expect } from "chai";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";

describe("Next tests reproduce identity life cycle", () => {
  let identity;
  let latestSavedState;
  let latestComputedState;

  describe("create identity", function () {
    it("deploy state and identity", async function () {
      const stDeployHelper = await StateDeployHelper.initialize();
      const deployHelper = await OnchainIdentityDeployHelper.initialize();
      const stContracts = await stDeployHelper.deployStateV2();
      const contracts = await deployHelper.deployIdentity(
        stContracts.state,
        stContracts.smt,
        stContracts.poseidon1,
        stContracts.poseidon2,
        stContracts.poseidon3,
        stContracts.poseidon4
      );
      identity = contracts.identity;
    });

    it("validate identity's id", async function () {
      const id = await identity.id();
      expect(id).to.be.equal(
        445307576041273966129146714946602093123957626136629497001119894618167443457n
      );
    });
  });

  describe("validate initial identity", function () {
    let initialClaimTreeRoot, initialRevocationTreeRoot, initialRootOfRootsTreeRoot: any;
    before(async function () {
      initialClaimTreeRoot = await identity.getClaimsTreeRoot();
      initialRevocationTreeRoot = await identity.getRevocationsTreeRoot();
      initialRootOfRootsTreeRoot = await identity.getRootsTreeRoot();
    });

    it("since claim tree root contains 'auth' claim with contract address. should not be empty", async function () {
      expect(initialClaimTreeRoot).not.be.equal(0);
    });
    it("latest claims root should be equal to claim tree root", async function () {
      const lastClaimTreeRoot = await identity.lastClaimsTreeRoot();
      expect(lastClaimTreeRoot).to.be.equal(initialClaimTreeRoot);
    });
    it("another trees should be empty", async function () {
      expect(initialRevocationTreeRoot).to.be.equal(0);
      expect(initialRootOfRootsTreeRoot).to.be.equal(0);
    });

    it("Root of roots and Revocation root should be empty", async function () {
      const lastRevocationTreeRoot = await identity.lastRevocationsTreeRoot();
      const lastRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();

      expect(lastRevocationTreeRoot).to.be.equal(0);
      expect(lastRootOfRootsTreeRoot).to.be.equal(0);
    });
    it("since the identity did not perform the transition - the isGenesis flag should be true", async function () {
      const isOldStateGenesis = await identity.isOldStateGenesis();
      expect(isOldStateGenesis).to.be.true;
    });
    it(
      "since the constructor of identity calculates the state" +
        "State from the field and calculate function should be the same",
      async function () {
        latestComputedState = await identity.calcIdentityState();
        latestSavedState = await identity.identityState();
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
      lastClaimTreeRoot = await identity.lastClaimsTreeRoot();
      lastRevocationTreeRoot = await identity.lastRevocationsTreeRoot();
      lastRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();

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
      const afterInsertLastClaimTreeRoot = await identity.lastClaimsTreeRoot();
      const afterInsertLastRevocationTreeRoot = await identity.lastRevocationsTreeRoot();
      const afterInsertLastRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();

      expect(afterInsertLastClaimTreeRoot).to.be.equal(lastClaimTreeRoot);
      expect(afterInsertLastRevocationTreeRoot).to.be.equal(lastRevocationTreeRoot);
      expect(afterInsertLastRootOfRootsTreeRoot).to.be.equal(lastRootOfRootsTreeRoot);
    });

    it("computes state should be different from latest saved state", async function () {
      latestComputedState = await identity.calcIdentityState();
      latestSavedState = await identity.identityState();
      expect(latestComputedState).to.be.not.equal(latestSavedState);
    });
  });

  describe("make transition", function () {
    let beforeTransitionClaimTreeRoot,
      beforeTransitionRevocationTreeRoot,
      beforeTransitionRootOfRootsTreeRoot;

    before(async function () {
      beforeTransitionClaimTreeRoot = await identity.lastClaimsTreeRoot();
      beforeTransitionRevocationTreeRoot = await identity.lastRevocationsTreeRoot();
      beforeTransitionRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();
      await identity.transitState();
    });

    it("latest roots for ClaimsTree and RootOfRoots should be updated", async function () {
      const afterTransitionClaimTreeRoot = await identity.lastClaimsTreeRoot();
      expect(afterTransitionClaimTreeRoot).to.be.not.equal(beforeTransitionClaimTreeRoot);
    });
    it("Revocation root should be empty", async function () {
      const afterTransitionRevocationTreeRoot = await identity.lastRevocationsTreeRoot();
      expect(afterTransitionRevocationTreeRoot).to.be.equal(0);
      expect(afterTransitionRevocationTreeRoot).to.be.equal(beforeTransitionRevocationTreeRoot);
    });

    it("Root of roots and claims root should be updated", async function () {
      const afterTranstionLatestSavedState = await identity.identityState();
      const afterTransitionRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();

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
      beforeRevocationClaimTreeRoot = await identity.lastClaimsTreeRoot();
      beforeRevocationRevocationTreeRoot = await identity.lastRevocationsTreeRoot();
      beforeRevocationRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();
      await identity.revokeClaim(1);
    });

    it("revoced index should exists in Revocation tree", async function () {
      const proof = await identity.getRevocationProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.true;
    });

    it("transit of revocation tree shouldn't update root of roots tree", async function () {
      const beforeRevocationRootOfRootsTreeRoot = await identity.lastRevocationsTreeRoot();
      expect(beforeRevocationRootOfRootsTreeRoot).to.be.equal(beforeRevocationRevocationTreeRoot);
    });

    it("Root of Roots and Claims Root should be changed", async function () {
      const afterRevocationClaimTreeRoot = await identity.lastClaimsTreeRoot();
      const afterRevocationRootOfRootsTreeRoot = await identity.lastRootsTreeRoot();

      expect(afterRevocationClaimTreeRoot).to.be.equal(beforeRevocationClaimTreeRoot);
      expect(afterRevocationRootOfRootsTreeRoot).to.be.equal(beforeRevocationRootOfRootsTreeRoot);
    });
  });

  describe("make transition after revocation", function () {
    let beforeTransitionLatestSavedState;
    before(async function () {
      beforeTransitionLatestSavedState = await identity.identityState();
      await identity.transitState();
    });
    it("state should be updated", async function () {
      const afterTransitionLatestSavedState = await identity.identityState();
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
      stContracts.smt,
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
      stContracts.smt,
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
      stContracts.smt,
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
      latestRootOfRootsRoot = await identity.lastRootsTreeRoot();
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
