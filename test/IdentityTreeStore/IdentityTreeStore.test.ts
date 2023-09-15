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
    const nonce = 7n;
    const leafWithNonceIndex = [nonce, 0n, 1n];
    const revRoot = poseidon.hash(leafWithNonceIndex);
    const preimages = [[1n, revRoot, 3n], leafWithNonceIndex];
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

    const revStatusById = await identityTreeStore.getRevocationStatus(id, nonce);

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
  });

  it("Should return the revocation status many leafs", async function () {
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

    const revStatusById = await identityTreeStore.getRevocationStatus(id, nonce);

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
    ).to.be.revertedWith("Invalid roots length");

    await expect(identityTreeStore.getRevocationStatus(id, nonce)).to.be.revertedWith(
      "Invalid roots length"
    );
  });
});
