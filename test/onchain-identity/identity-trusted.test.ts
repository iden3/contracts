import { expect } from "chai";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { AbiCoder } from "ethers";
import { hexToBytes } from "@0xpolygonid/js-sdk";

let publicKey: CryptoKey;
let privateKey: CryptoKey;
let publicKeyCompressed: string;

async function signClaim(hashIndex, hashValue, privateKey) {
  const encoder = new AbiCoder();
  const messageEncoded = encoder.encode(["uint256", "uint256"], [hashIndex, hashValue]);
  const messageBuffer = hexToBytes(messageEncoded);
  const messageHashBuffer = await crypto.subtle.digest("SHA-384", messageBuffer);

  const signatureBuffer = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-384",
    },
    privateKey,
    messageBuffer,
  );

  return {
    message: `0x${Buffer.from(messageBuffer).toString("hex")}`,
    messageHash: `0x${Buffer.from(messageHashBuffer).toString("hex")}`,
    signature: `0x${Buffer.from(signatureBuffer).toString("hex")}`,
  };
}

async function generateP384Keys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign", "verify"],
  );

  const publicKeyExtracted = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const publicKeyX = Buffer.from(publicKeyExtracted.x!, "base64").toString("hex");
  const publicKeyY = Buffer.from(publicKeyExtracted.y!, "base64").toString("hex");
  const publicKeyXYCompressed = `0x${publicKeyX}${publicKeyY}`;

  return {
    generatedPrivateKey: keyPair.privateKey,
    generatedPublicKey: keyPair.publicKey,
    publicKeyXYCompressed,
  };
}

async function importP384Keys() {
  const jwkPrivateKey = {
    key_ops: ["sign"],
    ext: true,
    kty: "EC",
    x: "oSZkzjHSaHFzoiJwpMP5bWvO86FnzQmMgikQJ5zK32mmeq4x0sO8DQoYjkSIG-Wf",
    y: "Ybf6DWDoMSvLF4_wxvGjRBVmrT4QytmXLnj1U95HAEoMkIn7Fm7_0zD2k0AhNpfF",
    crv: "P-384",
    d: "qkVtf_3bcxOwqCjF37AWuyxj7nCp6ymdA6q2_HIbEeVMOjkkvIYUjtBO_b2OsMMr",
  };

  const jwkPublicKey = {
    key_ops: ["verify"],
    ext: true,
    kty: "EC",
    x: "oSZkzjHSaHFzoiJwpMP5bWvO86FnzQmMgikQJ5zK32mmeq4x0sO8DQoYjkSIG-Wf",
    y: "Ybf6DWDoMSvLF4_wxvGjRBVmrT4QytmXLnj1U95HAEoMkIn7Fm7_0zD2k0AhNpfF",
    crv: "P-384",
  };

  const generatedPrivateKey = await crypto.subtle.importKey(
    "jwk",
    jwkPrivateKey,
    { name: "ECDSA", namedCurve: "P-384" },
    true,
    ["sign"],
  );

  const generatedPublicKey = await crypto.subtle.importKey(
    "jwk",
    jwkPublicKey,
    { name: "ECDSA", namedCurve: "P-384" },
    true,
    ["verify"],
  );

  const publicKeyX = Buffer.from(jwkPublicKey.x!, "base64").toString("hex");
  const publicKeyY = Buffer.from(jwkPublicKey.y!, "base64").toString("hex");
  const publicKeyXYCompressed = `0x${publicKeyX}${publicKeyY}`;

  return {
    generatedPrivateKey,
    generatedPublicKey,
    publicKeyXYCompressed,
  };
}

describe("Next tests reproduce identity trusted life cycle", function () {
  this.timeout(10000);

  let identity;
  let latestSavedState;
  let latestComputedState;
  let identityId;

  before(async function () {
    const stDeployHelper = await DeployHelper.initialize();
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const stContracts = await stDeployHelper.deployStateWithLibraries();
    const contracts = await identityDeployHelper.deployIdentity(
      await stContracts.state.getAddress(),
      await stContracts.smtLib.getAddress(),
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
      stContracts.defaultIdType,
      "IdentityTrusted",
    );

    identity = contracts.identity;
    const guWrpr = await stDeployHelper.deployGenesisUtilsWrapper();
    identityId = await guWrpr.calcOnchainIdFromAddress(
      stContracts.defaultIdType,
      await identity.getAddress(),
    );
  });

  describe("create identity", function () {
    it("deploy state and identity", async function () {
      expect(await identity.getIsOldStateGenesis()).to.be.equal(true);
    });

    it("validate identity's id", async function () {
      const id = await identity.getId();
      expect(id).to.be.equal(identityId);
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
      const lastClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      const lastRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      const lastRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();

      expect(lastClaimTreeRoot).to.be.equal(initialClaimTreeRoot);
      expect(lastRevocationTreeRoot).to.be.equal(0);
      expect(lastRootOfRootsTreeRoot).to.be.equal(0);
    });
    it("since the identity did not perform the transition - the isGenesis flag should be true", async function () {
      const isOldStateGenesis = await identity.getIsOldStateGenesis();
      expect(isOldStateGenesis).to.be.true;
    });
    it("latest identity state should be empty", async function () {
      latestSavedState = await identity.getLatestPublishedState();
      expect(latestSavedState).to.be.equal(0);
    });
    it("getClaimProofWithStateInfo should return non-existence proof", async function () {
      const proof = await identity.getClaimProofWithStateInfo(1);
      expect(proof[0].existence).to.be.false;
    });
    it("getRevocationProofWithStateInfo should return non-existence proof", async function () {
      const proof = await identity.getRevocationProofWithStateInfo(1);
      expect(proof[0].existence).to.be.false;
    });
    it("getRootProofWithStateInfo should return non-existence proof", async function () {
      const proof = await identity.getRootProofWithStateInfo(1);
      expect(proof[0].existence).to.be.false;
    });
  });

  describe("test P-384", function () {
    before(async function () {
      /* ({
        generatedPrivateKey: privateKey,
        generatedPublicKey: publicKey,
        publicKeyXYCompressed: publicKeyCompressed,
      } = await generateP384Keys());

      await identity.setSignerPubKey(publicKeyCompressed); */

      ({
        generatedPrivateKey: privateKey,
        generatedPublicKey: publicKey,
        publicKeyXYCompressed: publicKeyCompressed,
      } = await importP384Keys());
    });

    it("Verify signature P-384 with library", async function () {
      // create claim and sign it
      const hashIndex = 1;
      const hashValue = 2;

      const { message, signature } = await signClaim(hashIndex, hashValue, privateKey);

      const verified = await crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: "SHA-384",
        },
        publicKey,
        hexToBytes(signature),
        hexToBytes(message),
      );
      expect(verified).to.be.true;
    });

    it("Verify signature P-384 with Identity SC", async function () {
      // create claim and sign it
      const hashIndex = 2;
      const hashValue = 3;

      const { message, messageHash, signature } = await signClaim(hashIndex, hashValue, privateKey);
      // Test SC SECP384r1 verification functions
      const verifiedSC = await identity.verifySECP384r1(message, signature, publicKeyCompressed);
      expect(verifiedSC).to.be.true;

      const verifiedSC2 = await identity.verifySECP384r1WithoutHashing(
        messageHash,
        signature,
        publicKeyCompressed,
      );
      expect(verifiedSC2).to.be.true;
    });

    it("Add claim with signature P-384", async function () {
      // create claim and sign it
      const hashIndex = 3;
      const hashValue = 4;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);
      await expect(
        identity.addClaimHash(hashIndex, hashValue, `0x${signature.slice(4)}`),
      ).to.be.revertedWithCustomError(identity, "InvalidSignatureLength");

      await expect(
        identity.addClaimHash(hashIndex, hashValue, `0x112233${signature.slice(8)}`),
      ).to.be.revertedWithCustomError(identity, "InvalidSignature");

      // Test adding claim with signature
      await identity.addClaimHash(hashIndex, hashValue, signature);
      const proof = await identity.getClaimProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.false;
    });
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

      lastClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      lastRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      lastRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();
      // create claim and sign it
      const hashIndex = 1;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);
    });

    it("we should not have proof about claim existing but not published", async function () {
      const proof = await identity.getClaimProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.false;
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
      const afterInsertLastClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      const afterInsertLastRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      const afterInsertLastRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();
      expect(afterInsertLastClaimTreeRoot).to.be.equal(lastClaimTreeRoot);
      expect(afterInsertLastRevocationTreeRoot).to.be.equal(lastRevocationTreeRoot);
      expect(afterInsertLastRootOfRootsTreeRoot).to.be.equal(lastRootOfRootsTreeRoot);
    });

    it("computes state should be different from latest saved state", async function () {
      latestComputedState = await identity.calcIdentityState();
      latestSavedState = await identity.getLatestPublishedState();
      expect(latestComputedState).to.be.not.equal(latestSavedState);
    });
  });

  describe("make transition", function () {
    let beforeTransitionClaimTreeRoot,
      beforeTransitionRevocationTreeRoot,
      beforeTransitionRootOfRootsTreeRoot;

    before(async function () {
      beforeTransitionClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      beforeTransitionRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      beforeTransitionRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();
      await identity.transitState();
    });

    it("we should have proof about claim existing if published", async function () {
      const proof = await identity.getClaimProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.true;
    });

    it("latest roots for ClaimsTree and RootOfRoots should be updated", async function () {
      const afterTransitionClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      expect(afterTransitionClaimTreeRoot).to.be.not.equal(beforeTransitionClaimTreeRoot);
    });
    it("Revocation root should be empty", async function () {
      const afterTransitionRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      expect(afterTransitionRevocationTreeRoot).to.be.equal(0);
      expect(afterTransitionRevocationTreeRoot).to.be.equal(beforeTransitionRevocationTreeRoot);
    });

    it("Root of roots and claims root should be updated", async function () {
      const afterTranstionLatestSavedState = await identity.getLatestPublishedState();
      const afterTransitionRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();

      expect(afterTransitionRootOfRootsTreeRoot).to.be.not.equal(0);
      expect(afterTransitionRootOfRootsTreeRoot).to.be.not.equal(
        beforeTransitionRootOfRootsTreeRoot,
      );
      expect(latestSavedState).to.be.not.equal(afterTranstionLatestSavedState);
      latestSavedState = afterTranstionLatestSavedState;
    });
    it("calculatet and saved status should be same", async function () {
      latestComputedState = await identity.calcIdentityState();
      expect(latestComputedState).to.be.equal(latestSavedState);
    });

    it("claim proof must exist after publishing and StateInfo should be latest", async function () {
      const latestState = await identity.getLatestPublishedState();
      const latestClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      const latestRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      const latestTransitionRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();

      const claimProof = await identity.getClaimProofWithStateInfo(1);
      expect(claimProof[0].existence).to.be.true;
      expect(claimProof[1].state).to.be.equal(latestState);
      expect(claimProof[1].claimsRoot).to.be.equal(latestClaimTreeRoot);
      expect(claimProof[1].revocationsRoot).to.be.equal(latestRevocationTreeRoot);
      expect(claimProof[1].rootsRoot).to.be.equal(latestTransitionRootOfRootsTreeRoot);
    });
  });
});

describe("Claims tree proofs", () => {
  let identity;
  let targetRoot;

  before(async function () {
    const stDeployHelper = await DeployHelper.initialize();
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const stContracts = await stDeployHelper.deployStateWithLibraries();
    const contracts = await identityDeployHelper.deployIdentity(
      await stContracts.state.getAddress(),
      await stContracts.smtLib.getAddress(),
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
      stContracts.defaultIdType,
      "IdentityTrusted",
    );
    identity = contracts.identity;
  });

  it("Insert new claim and generate proof", async function () {
    // create claim and sign it
    const hashIndex = 1;
    const hashValue = 2;

    const { signature } = await signClaim(hashIndex, hashValue, privateKey);

    await identity.addClaimHash(hashIndex, hashValue, signature);
    // We should take the latest root of the tree but getClaimProof()
    // will not return the latest root if it is not published
    // So we need to use getClaimProofByRoot() with the latest root
    targetRoot = await identity.getClaimsTreeRoot();
    const proof = await identity.getClaimProofByRoot(1, targetRoot);
    expect(proof.root).to.be.equal(targetRoot);
    expect(proof.existence).to.be.true;
    expect(proof.index).to.be.equal(1);
    expect(proof.value).to.be.equal(2);
    expect(proof.auxExistence).to.be.false;
    expect(proof.auxIndex).to.be.equal(0);
    expect(proof.auxValue).to.be.equal(0);
  });

  it("Get proof for claim by root", async function () {
    // create claim and sign it
    const hashIndex = 2;
    const hashValue = 2;

    const { signature } = await signClaim(hashIndex, hashValue, privateKey);

    await identity.addClaimHash(hashIndex, hashValue, signature);

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

describe("Root of roots tree proofs", () => {
  let identity;
  let latestRootOfRoots;

  before(async function () {
    const stDeployHelper = await DeployHelper.initialize();
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const stContracts = await stDeployHelper.deployStateWithLibraries();
    const contracts = await identityDeployHelper.deployIdentity(
      await stContracts.state.getAddress(),
      await stContracts.smtLib.getAddress(),
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
      stContracts.defaultIdType,
      "IdentityTrusted",
    );
    identity = contracts.identity;
  });

  describe("Insert two claims and make transtion state", () => {
    before(async function () {
      const hashIndex = 1;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);

      const hashIndex2 = 2;
      const hashValue2 = 2;

      const { signature: signature2 } = await signClaim(hashIndex2, hashValue2, privateKey);

      await identity.addClaimHash(hashIndex2, hashValue2, signature2);

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

      const hashIndex = 3;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);
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
      latestRootOfRootsRoot = await identity.getLatestPublishedRootsRoot();

      const hashIndex = 4;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);
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
    const stDeployHelper = await DeployHelper.initialize();
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const stContracts = await stDeployHelper.deployStateWithLibraries();
    const contracts = await identityDeployHelper.deployIdentity(
      await stContracts.state.getAddress(),
      await stContracts.smtLib.getAddress(),
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
      stContracts.defaultIdType,
      "IdentityTrusted",
    );
    identity = contracts.identity;

    ({
      generatedPrivateKey: privateKey,
      generatedPublicKey: publicKey,
      publicKeyXYCompressed: publicKeyCompressed,
    } = await importP384Keys());
  });

  describe("Insert claims", () => {
    before(async function () {
      const hashIndex = 1;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);

      const hashIndex2 = 2;
      const hashValue2 = 2;

      const { signature: signature2 } = await signClaim(hashIndex2, hashValue2, privateKey);

      await identity.addClaimHash(hashIndex2, hashValue2, signature2);

      await identity.transitState();

      latestState = await identity.getLatestPublishedState();
    });

    it("Compare latest claims tree root", async function () {
      const latestClaimsTreeRoot = await identity.getClaimsTreeRoot();
      const history = await identity.getRootsByState(latestState);

      expect(latestClaimsTreeRoot).to.be.not.equal(0);
      expect(history.claimsRoot).to.be.deep.equal(latestClaimsTreeRoot);
    });
    it("Compare latest revocations tree root", async function () {
      const latestRevocationsTreeRoot = await identity.getRevocationsTreeRoot();
      const history = await identity.getRootsByState(latestState);

      expect(latestRevocationsTreeRoot).to.be.equal(0);
      expect(history.revocationsRoot).to.be.deep.equal(latestRevocationsTreeRoot);
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
    const stDeployHelper = await DeployHelper.initialize();
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const stContracts = await stDeployHelper.deployStateWithLibraries();
    const contracts = await identityDeployHelper.deployIdentity(
      await stContracts.state.getAddress(),
      await stContracts.smtLib.getAddress(),
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
      stContracts.defaultIdType,
      "IdentityTrusted",
    );
    identity = contracts.identity;
  });

  describe("Check prev states", () => {
    before(async function () {
      const hashIndex = 1;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);
      await identity.transitState();
      prevState = await identity.getLatestPublishedState();
    });
    it("Compare latest claims tree root", async function () {
      const latestClaimsTreeRoot = await identity.getClaimsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestClaimsTreeRoot).to.be.not.equal(0);
      expect(history.claimsRoot).to.be.deep.equal(latestClaimsTreeRoot);
      historyClaimsTreeRoot = latestClaimsTreeRoot;
    });
    it("Compare latest revocations tree root", async function () {
      const latestRevocationsTreeRoot = await identity.getRevocationsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestRevocationsTreeRoot).to.be.equal(0);
      expect(history.revocationsRoot).to.be.deep.equal(latestRevocationsTreeRoot);
      historyRevocationsTreeRoot = latestRevocationsTreeRoot;
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
      const hashIndex = 2;
      const hashValue = 2;

      const { signature } = await signClaim(hashIndex, hashValue, privateKey);

      await identity.addClaimHash(hashIndex, hashValue, signature);
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
      const latestRevocationsTreeRoot = await identity.getRevocationsTreeRoot();
      const history = await identity.getRootsByState(prevState);

      expect(latestRevocationsTreeRoot).to.be.equal(0);
      expect(history.revocationsRoot).to.be.deep.equal(latestRevocationsTreeRoot);
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
    const stDeployHelper = await DeployHelper.initialize();
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const stContracts = await stDeployHelper.deployStateWithLibraries();
    const contracts = await identityDeployHelper.deployIdentity(
      await stContracts.state.getAddress(),
      await stContracts.smtLib.getAddress(),
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
      stContracts.defaultIdType,
      "IdentityTrusted",
    );
    identity = contracts.identity;
  });

  describe("Empty history map", () => {
    it("Got an error", async function () {
      const latestState = await identity.calcIdentityState();
      try {
        await identity.getRootsByState(latestState);
        expect.fail("The transaction should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("Roots for this state doesn't exist");
      }
    });
  });
});
