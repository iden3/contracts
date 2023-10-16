import { expect } from "chai";
import { poseidon } from "@iden3/js-crypto";
import { DeployHelper } from "../../helpers/DeployHelper";
import { BigNumber, Contract } from "ethers";
import { publishStateWithStubProof } from "../utils/state-utils";

const verifierStubName = "VerifierStub";

describe("IdentityTreeStore", function () {
  let identityTreeStore, stateContract: Contract;

  beforeEach(async function () {
    const deployHelper = await DeployHelper.initialize();
    ({ state: stateContract } = await deployHelper.deployState(verifierStubName));
    ({ identityTreeStore } = await deployHelper.deployIdentityTreeStore(stateContract.address));
  });

  it("Should return the revocation status single leaf", async function () {
    const id = 1;
    const nonce = 1n;
    const revRoot = poseidon.hash([nonce, 0n, 1n]);
    const preimages = [
      [1n, revRoot, 3n],
      [nonce, 0n, 1n],
    ];
    const state = poseidon.hash(preimages[0]);

    await identityTreeStore.saveNodes(preimages);
    const revStatusByState = await identityTreeStore.getRevocationStatusByIdAndState(
      id,
      state,
      nonce
    );

    const stateTransitionArgs = {
      id,
      oldState: 1,
      newState: state,
      isOldStateGenesis: true,
    };

    await publishStateWithStubProof(stateContract, stateTransitionArgs);

    // existence
    let revStatusById = await identityTreeStore.getRevocationStatus(id, nonce);

    expect(revStatusById).to.deep.equal(revStatusByState);

    expect(revStatusById.issuer.state).to.equal(state);
    expect(revStatusById.issuer.claimsTreeRoot).to.equal(1);
    expect(revStatusById.issuer.revocationTreeRoot).to.equal(revRoot);
    expect(revStatusById.issuer.rootOfRoots).to.equal(3);

    expect(revStatusById.mtp.root).to.equal(revRoot);
    expect(revStatusById.mtp.existence).to.equal(true);
    expect(revStatusById.mtp.siblings).to.deep.equal(Array(40).fill(BigNumber.from(0)));
    expect(revStatusById.mtp.index).to.equal(nonce);
    expect(revStatusById.mtp.value).to.equal(0);
    expect(revStatusById.mtp.auxExistence).to.equal(false);
    expect(revStatusById.mtp.auxIndex).to.equal(0);
    expect(revStatusById.mtp.auxValue).to.equal(0);

    // non-existence with aux
    revStatusById = await identityTreeStore.getRevocationStatus(id, nonce + 1n);

    expect(revStatusById.mtp.root).to.equal(revRoot);
    expect(revStatusById.mtp.existence).to.equal(false);
    expect(revStatusById.mtp.siblings).to.deep.equal(Array(40).fill(BigNumber.from(0)));
    expect(revStatusById.mtp.index).to.equal(nonce + 1n);
    expect(revStatusById.mtp.value).to.equal(0);
    expect(revStatusById.mtp.auxExistence).to.equal(true);
    expect(revStatusById.mtp.auxIndex).to.equal(nonce);
    expect(revStatusById.mtp.auxValue).to.equal(0);
  });

  describe("Should return the revocation status many leafs", function () {
    it("left key path", async function () {
      const id = 1n;
      const nonce = 2n;
      const leaf1index = 4n;
      const leaf2index = nonce;

      const leaf1hash = poseidon.hash([leaf1index, 0n, 1n]);
      const leaf2hash = poseidon.hash([leaf2index, 0n, 1n]);
      const middleNodeHash = poseidon.hash([leaf1hash, leaf2hash]);
      const revRoot = poseidon.hash([middleNodeHash, 0n]);
      const state = poseidon.hash([1n, revRoot, 3n]);

      const preimages = [
        [leaf1index, 0n, 1n], // leaf
        [leaf2index, 0n, 1n], // leaf
        [leaf1hash, leaf2hash], // middle node
        [middleNodeHash, 0n], // root
        [1n, revRoot, 3n], // state
      ];

      await identityTreeStore.saveNodes(preimages);
      const revStatusByState = await identityTreeStore.getRevocationStatusByIdAndState(
        id,
        state,
        nonce
      );

      const stateTransitionArgs = {
        id,
        oldState: 1,
        newState: state,
        isOldStateGenesis: true,
      };

      await publishStateWithStubProof(stateContract, stateTransitionArgs);

      // existence
      let revStatusById = await identityTreeStore.getRevocationStatus(id, nonce);

      expect(revStatusById).to.deep.equal(revStatusByState);

      expect(revStatusById.issuer.state).to.equal(state);
      expect(revStatusById.issuer.claimsTreeRoot).to.equal(1);
      expect(revStatusById.issuer.revocationTreeRoot).to.equal(revRoot);
      expect(revStatusById.issuer.rootOfRoots).to.equal(3);

      expect(revStatusById.mtp.root).to.equal(revRoot);
      expect(revStatusById.mtp.existence).to.equal(true);
      expect(revStatusById.mtp.siblings).to.deep.equal(
        [
          BigNumber.from(0),
          BigNumber.from(
            "6949980352176809960902782436662588039414117260217395356682829284808595441653"
          ),
        ].concat(Array(38).fill(BigNumber.from(0)))
      );
      expect(revStatusById.mtp.index).to.equal(nonce);
      expect(revStatusById.mtp.value).to.equal(0);
      expect(revStatusById.mtp.auxExistence).to.equal(false);
      expect(revStatusById.mtp.auxIndex).to.equal(0);
      expect(revStatusById.mtp.auxValue).to.equal(0);

      // non-existence with aux
      let nonExistingIndex = 8n;
      revStatusById = await identityTreeStore.getRevocationStatus(id, nonExistingIndex);

      expect(revStatusById.mtp.root).to.equal(revRoot);
      expect(revStatusById.mtp.existence).to.equal(false);
      expect(revStatusById.mtp.siblings).to.deep.equal(
        [
          BigNumber.from(0),
          BigNumber.from(
            "16893244256367465864542014032080213413654599301942077056250173615273598292583"
          ),
        ].concat(Array(38).fill(BigNumber.from(0)))
      );
      expect(revStatusById.mtp.index).to.equal(nonExistingIndex);
      expect(revStatusById.mtp.value).to.equal(0);
      expect(revStatusById.mtp.auxExistence).to.equal(true);
      expect(revStatusById.mtp.auxIndex).to.equal(4n);
      expect(revStatusById.mtp.auxValue).to.equal(0);

      // non-existence without aux
      nonExistingIndex = 1n;
      revStatusById = await identityTreeStore.getRevocationStatus(id, nonExistingIndex);

      expect(revStatusById.mtp.root).to.equal(revRoot);
      expect(revStatusById.mtp.existence).to.equal(false);
      expect(revStatusById.mtp.siblings).to.deep.equal(
        [
          BigNumber.from(
            "4923219850055277158065523309848923357324823470193729569414506026481393416506"
          ),
        ].concat(Array(39).fill(BigNumber.from(0)))
      );
      expect(revStatusById.mtp.index).to.equal(nonExistingIndex);
      expect(revStatusById.mtp.value).to.equal(0);
      expect(revStatusById.mtp.auxExistence).to.equal(false);
      expect(revStatusById.mtp.auxIndex).to.equal(0);
      expect(revStatusById.mtp.auxValue).to.equal(0);
    });

    it("right key path", async function () {
      const id = 1n;
      const nonce = 1n;
      const leaf1index = 3n;
      const leaf2index = nonce;

      const leaf1hash = poseidon.hash([leaf1index, 0n, 1n]);
      const leaf2hash = poseidon.hash([leaf2index, 0n, 1n]);
      const middleNodeHash = poseidon.hash([leaf2hash, leaf1hash]);
      const revRoot = poseidon.hash([0n, middleNodeHash]);
      const state = poseidon.hash([1n, revRoot, 3n]);

      const preimages = [
        [leaf1index, 0n, 1n], // leaf
        [leaf2index, 0n, 1n], // leaf
        [leaf2hash, leaf1hash], // middle node
        [0n, middleNodeHash], // root
        [1n, revRoot, 3n], // state
      ];

      await identityTreeStore.saveNodes(preimages);
      const revStatusByState = await identityTreeStore.getRevocationStatusByIdAndState(
        id,
        state,
        nonce
      );

      const stateTransitionArgs = {
        id,
        oldState: 1,
        newState: state,
        isOldStateGenesis: true,
      };

      await publishStateWithStubProof(stateContract, stateTransitionArgs);

      // existence
      let revStatusById = await identityTreeStore.getRevocationStatus(id, nonce);

      expect(revStatusById).to.deep.equal(revStatusByState);

      expect(revStatusById.issuer.state).to.equal(state);
      expect(revStatusById.issuer.claimsTreeRoot).to.equal(1);
      expect(revStatusById.issuer.revocationTreeRoot).to.equal(revRoot);
      expect(revStatusById.issuer.rootOfRoots).to.equal(3);

      expect(revStatusById.mtp.root).to.equal(revRoot);
      expect(revStatusById.mtp.existence).to.equal(true);
      expect(revStatusById.mtp.siblings).to.deep.equal(
        [
          BigNumber.from(0),
          BigNumber.from(
            "18055627789841181316500608856722684043944115961354987268304016120532204822528"
          ),
        ].concat(Array(38).fill(BigNumber.from(0)))
      );
      expect(revStatusById.mtp.index).to.equal(nonce);
      expect(revStatusById.mtp.value).to.equal(0);
      expect(revStatusById.mtp.auxExistence).to.equal(false);
      expect(revStatusById.mtp.auxIndex).to.equal(0);
      expect(revStatusById.mtp.auxValue).to.equal(0);

      // non-existence with aux
      let nonExistingIndex = 7n;
      revStatusById = await identityTreeStore.getRevocationStatus(id, nonExistingIndex);

      expect(revStatusById.mtp.root).to.equal(revRoot);
      expect(revStatusById.mtp.existence).to.equal(false);
      expect(revStatusById.mtp.siblings).to.deep.equal(
        [
          BigNumber.from(0),
          BigNumber.from(
            "19374975721259875597650302716689543547647001662517455822229477759190533109280"
          ),
        ].concat(Array(38).fill(BigNumber.from(0)))
      );
      expect(revStatusById.mtp.index).to.equal(nonExistingIndex);
      expect(revStatusById.mtp.value).to.equal(0);
      expect(revStatusById.mtp.auxExistence).to.equal(true);
      expect(revStatusById.mtp.auxIndex).to.equal(3n);
      expect(revStatusById.mtp.auxValue).to.equal(0);

      // non-existence without aux
      nonExistingIndex = 2n;
      revStatusById = await identityTreeStore.getRevocationStatus(id, nonExistingIndex);

      expect(revStatusById.mtp.root).to.equal(revRoot);
      expect(revStatusById.mtp.existence).to.equal(false);
      expect(revStatusById.mtp.siblings).to.deep.equal(
        [
          BigNumber.from(
            "18003115155595189826451073637653199212465749960078311721824394167192960280094"
          ),
        ].concat(Array(39).fill(BigNumber.from(0)))
      );
      expect(revStatusById.mtp.index).to.equal(nonExistingIndex);
      expect(revStatusById.mtp.value).to.equal(0);
      expect(revStatusById.mtp.auxExistence).to.equal(false);
      expect(revStatusById.mtp.auxIndex).to.equal(0);
      expect(revStatusById.mtp.auxValue).to.equal(0);
    });
  });

  it("Should revert on invalid roots length", async function () {
    const id = 1;
    const preimages = [[1n, 2n]];
    await identityTreeStore.saveNodes(preimages);
    const state = poseidon.hash(preimages[0]);
    const nonce = 12345;

    const stateTransitionArgs = {
      id,
      oldState: 1,
      newState: state,
      isOldStateGenesis: true,
    };

    await publishStateWithStubProof(stateContract, stateTransitionArgs);

    await expect(
      identityTreeStore.getRevocationStatusByIdAndState(id, state, nonce)
    ).to.be.revertedWith("Invalid state node");

    await expect(identityTreeStore.getRevocationStatus(id, nonce)).to.be.revertedWith(
      "Invalid state node"
    );
  });
});
