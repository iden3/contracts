import { expect } from "chai";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { AbiCoder } from "ethers";
import { hexToBytes } from "@0xpolygonid/js-sdk";

describe("Next tests reproduce identity life cycle", function () {
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

  describe.only("test P-384", function () {
    it("Generate keys, sign and verify P-384", async function () {
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

      /* const keyPair = await crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-384",
        },
        true,
        ["sign", "verify"],
      );
      
      console.log(
        "keyPair",
        await crypto.subtle.exportKey("jwk", keyPair.privateKey),
        await crypto.subtle.exportKey("jwk", keyPair.publicKey),
      );

      const publicKey = keyPair.publicKey;
      */

      const privateKey = await crypto.subtle.importKey(
        "jwk",
        jwkPrivateKey,
        { name: "ECDSA", namedCurve: "P-384" },
        true,
        ["sign"],
      );

      const publicKey = await crypto.subtle.importKey(
        "jwk",
        jwkPublicKey,
        { name: "ECDSA", namedCurve: "P-384" },
        true,
        ["verify"],
      );

      const hashIndex = 1;
      const hashValue = 2;

      const encoder = new AbiCoder();
      const messageEncoded = encoder.encode(["uint256", "uint256"], [hashIndex, hashValue]);
      const messageBuffer = hexToBytes(messageEncoded);

      const signatureBuffer = await crypto.subtle.sign(
        {
          name: "ECDSA",
          hash: "SHA-384",
        },
        privateKey,
        messageBuffer,
      );

      expect(signatureBuffer).not.to.be.undefined;

      const verified = await crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: "SHA-384",
        },
        publicKey,
        signatureBuffer,
        messageBuffer,
      );
      expect(verified).to.be.true;

      const publicKeyExtracted = await crypto.subtle.exportKey("jwk", publicKey);
      const publicKeyX = Buffer.from(publicKeyExtracted.x!, "base64").toString("hex");
      const publicKeyY = Buffer.from(publicKeyExtracted.y!, "base64").toString("hex");

      const messageHashBuffer = await crypto.subtle.digest("SHA-384", messageBuffer);

      const signature = `0x${Buffer.from(signatureBuffer).toString("hex")}`;
      // Valid signature
      // const signature = `0x9d0c0da61d3aedff31b5095a0512149d18aa7ee712f1a18404689d134e7c1a778cd43ab075d4fa0c5c2bbced7ddbcca719503b52a450c3b6de7da682b54100694c91f15b4ca93ceb1e0adeb0ec81e71300f2375d035f2b3f8a81707421dec118`;
      // Not valid signature
      // const signature = `0x8d851c4db28ba1e0d8481feded601285509e297a781fdcb40b62d1105eac00e1653401e428d257a55a654e06ca1a5ec39af3fa11c2447e02257ef130a4bd8a5d03d4027ff7490d32090c0d195d9ab8e710494b7f9881d4ac8e6d1225a27040d0`;
      const message = messageEncoded; // `0x${Buffer.from(messageBuffer).toString("hex")}`;
      const messageHash = `0x${Buffer.from(messageHashBuffer).toString("hex")}`;
      const pubKey = `0x${publicKeyX}${publicKeyY}`;
      console.log("Public Key", publicKeyX, publicKeyY);

      /*const message =
        "0x30783030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303130303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303032";
      const signature =
        "0x42d8dc07211edde9db3e9695d11ed26630717c1cb83a246837932b0ba0e1cfd824f1e7fd74566bda4cacd31ae7ce158c7d3f458f38e38c005f2485e84a60626284336fe76efbbe13b3c44e126285ac48f094234057135b58c71a15addf358eb4";
      const pubKey =
        "0x5b0ea4a384d14991f5de173d1f63f005976350204e9d08babc540d02fec4f54b9ecaa7ad42b1f08c1d4095947788af20c335c3c026dcacc84299d334fef4193fc54337ce3687d102d357881d4b50a64bd6038c1994051069cf2d34e6d0399b7d";
      const messageHash =
        "0x80fffc402fa287728b4b5b67bfd8e68ee3608cf2e4d82853c3b6dacea9eac5135f6edb3f02a7a860d1dc8bc35f933299";
      */
      /* // BAD

      const message = "0x74657374"; // message: test
      const signature =
        "0x54a6e5f0f792ba804128ed15ce70ce4fe474c809e1a6cf6ad93f0fc7e08b0d68d8e76ff3ba6e40182c50c6c739fbf85982df8b969850adb46fbd12637f0bed0b96435c0da2b50dc95b38dee11865cd2756145db8e7d7a6e3388dad3984b25c31";
      const pubKey =
        "0x6a339eb0cda98149e5009238d4b83647887995a1309bf64be6045febf26c75da3dd98d053ad4f3a286aeff684d66ac16bcb954ad55d64d17fbb0d44c245a297d43ee54d8861b963a3e7c152e68d4b2a6eccf34166ec504569d87f28ee5c73fcd";
      const messageHash =
        "0x768412320f7b0aa5812fce428dc4706b3cae50e02a64caa16a782249bfe8efc4b7ef1ccb126255d196047dfedf17a0a9";
 */
      /* // GOOD
      
      const message = "0x74657374"; // message: test
      const signature =
        "0x5d32074f30a14aa2a0d3ad14b42abb868d375844ad1e289488bf3187273527366b32228f7303d859cf084a074984ac9a150de248044370b1d87bef9fc3a2b5b2107bde57d7080f9812d387e44bcf0080e1f5a2ced49bc1b87435ce237d5076a2";
      const pubKey =
        "0x806898591930188e3123b5fe2af97efa02f7a271e1adf8801d8d58767e7da23f3446e5173756178db0134ef70cc048a96c00814290624dca34b8aff3629de559b1da589ab15737ff799a85885d32c00667dc0c782f5fc344a59e553b9bd488dd";
      const messageHash =
        "0x768412320f7b0aa5812fce428dc4706b3cae50e02a64caa16a782249bfe8efc4b7ef1ccb126255d196047dfedf17a0a9";
*/
      /* const messageHash =
        "0xfc000000009322da48a8586f26f148003932f6d4c0d1ce3a21798f7b651dab7642188c9061a66dc9b190e00b0290e264";
      const signature =
        "0xe14f41a5fc83aa4725a9ea60ab5b0b9de27f519af4b557a601f1fee0243f8eee5180f8c531414f3473f4457430cb7a261047ed2bf1f98e3ce93e8fdbdc63cc79f238998fee74e1bb6cd708694950bbffe3945066064da043f04d7083d0a596ec";
      const pubKey =
        "0x2da57dda1089276a543f9ffdac0bff0d976cad71eb7280e7d9bfd9fee4bdb2f20f47ff888274389772d98cc5752138aa4b6d054d69dcf3e25ec49df870715e34883b1836197d76f8ad962e78f6571bbc7407b0d6091f9e4d88f014274406174f";
*/

      console.log(message, signature, pubKey, messageHash);

      const verifiedSC = await identity.verifySECP384r1(message, signature, pubKey);
      expect(verifiedSC).to.be.true;

      const verifiedSC2 = await identity.verifySECP384r1WithoutHashing(
        messageHash,
        signature,
        pubKey,
      );
      expect(verifiedSC2).to.be.true;

      await identity.addClaimHashWithSignature(1, 2, signature);
      const proof = await identity.getClaimProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.false;
    });
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
      await identity.addClaimHash(1, 2);
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

  describe("revoke state", function () {
    let beforeRevocationClaimTreeRoot,
      beforeRevocationRevocationTreeRoot,
      beforeRevocationRootOfRootsTreeRoot;

    before(async function () {
      beforeRevocationClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      beforeRevocationRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      beforeRevocationRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();
      await identity.revokeClaim(1);
    });

    it("revoked index should not exists in Revocation tree if not published", async function () {
      const proof = await identity.getRevocationProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.false;
    });

    it("transit of revocation tree shouldn't update root of roots tree", async function () {
      const beforeRevocationRootOfRootsTreeRoot =
        await identity.getLatestPublishedRevocationsRoot();
      expect(beforeRevocationRootOfRootsTreeRoot).to.be.equal(beforeRevocationRevocationTreeRoot);
    });

    it("Root of Roots and Claims Root should be changed", async function () {
      const afterRevocationClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      const afterRevocationRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();

      expect(afterRevocationClaimTreeRoot).to.be.equal(beforeRevocationClaimTreeRoot);
      expect(afterRevocationRootOfRootsTreeRoot).to.be.equal(beforeRevocationRootOfRootsTreeRoot);
    });
  });

  describe("make transition after revocation", function () {
    let beforeTransitionLatestSavedState;

    before(async function () {
      beforeTransitionLatestSavedState = await identity.getLatestPublishedState();
      await identity.transitState();
    });

    it("revoked index should exists in Revocation tree if published", async function () {
      const proof = await identity.getRevocationProof(1);
      expect(proof).to.be.not.null;
      expect(proof.existence).to.be.true;
    });

    it("state should be updated", async function () {
      const afterTransitionLatestSavedState = await identity.getLatestPublishedState();
      expect(beforeTransitionLatestSavedState).to.be.not.equal(afterTransitionLatestSavedState);
    });

    it("revocation proof must exist after publishing and StateInfo should be latest", async function () {
      const latestState = await identity.getLatestPublishedState();
      const latestClaimTreeRoot = await identity.getLatestPublishedClaimsRoot();
      const latestRevocationTreeRoot = await identity.getLatestPublishedRevocationsRoot();
      const latestTransitionRootOfRootsTreeRoot = await identity.getLatestPublishedRootsRoot();

      const revocationProof = await identity.getRevocationProofWithStateInfo(1);
      expect(revocationProof[0].existence).to.be.true;
      expect(revocationProof[1].state).to.be.equal(latestState);
      expect(revocationProof[1].claimsRoot).to.be.equal(latestClaimTreeRoot);
      expect(revocationProof[1].revocationsRoot).to.be.equal(latestRevocationTreeRoot);
      expect(revocationProof[1].rootsRoot).to.be.equal(latestTransitionRootOfRootsTreeRoot);
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
    );
    identity = contracts.identity;
  });

  it("Insert new claim and generate proof", async function () {
    await identity.addClaimHash(1, 2);
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
    );
    identity = contracts.identity;
  });

  it("Insert new record to revocation tree and generate proof", async function () {
    await identity.revokeClaim(1);
    // We should take the latest root of the tree but getRevocationProof()
    // will not return the latest root if it is not published
    // So we need to use getRevocationProofByRoot() with the latest root
    targetRoot = await identity.getRevocationsTreeRoot();
    const proof = await identity.getRevocationProofByRoot(1, targetRoot);
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
      latestRootOfRootsRoot = await identity.getLatestPublishedRootsRoot();
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
    );
    identity = contracts.identity;
  });

  describe("Insert and revoke claims", () => {
    before(async function () {
      await identity.addClaimHash(1, 2);
      await identity.addClaimHash(2, 2);
      await identity.revokeClaim(1);
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
    );
    identity = contracts.identity;
  });

  describe("Check prev states", () => {
    before(async function () {
      await identity.addClaimHash(1, 2);
      await identity.revokeClaim(1);
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
