import { ethers } from "hardhat";
import { expect } from "chai";
import { poseidon } from "@iden3/js-crypto";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import { BigNumber } from "ethers";

describe("OnchainIdentityTreeStore", function () {
  let owner;
  let onchainIdentityTreeStore: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(owner, [2, 3]);
    // deploy helper
    const deployHelper = await DeployHelper.initialize();
    const { state } = await deployHelper.deployState();

    const OnchainIdentityTreeStore = await ethers.getContractFactory("OnchainIdentityTreeStore", {
      libraries: {
        PoseidonUnit2L: poseidon2Elements.address,
        PoseidonUnit3L: poseidon3Elements.address,
      },
    });

    //TODO fix to State address
    onchainIdentityTreeStore = await OnchainIdentityTreeStore.deploy(state.address);

    await onchainIdentityTreeStore.deployed();
  });

  it("should return the revocation status single leaf", async function () {
    const id = 0;
    const nonce = 7n;
    const leafWithNonceIndex = [nonce, 0n, 1n];
    const revRoot = poseidon.hash(leafWithNonceIndex);
    const preimages = [[1n, revRoot, 3n], leafWithNonceIndex];
    await onchainIdentityTreeStore.addNodes(preimages);

    const state = poseidon.hash(preimages[0]);
    const revocationStatus = await onchainIdentityTreeStore.getRevocationStatusByIdAndState(
      id,
      state,
      nonce
    );

    expect(revocationStatus.issuer.state).to.equal(state);
    expect(revocationStatus.issuer.claimsTreeRoot).to.equal(1);
    expect(revocationStatus.issuer.revocationTreeRoot).to.equal(revRoot);
    expect(revocationStatus.issuer.rootOfRoots).to.equal(3);

    expect(revocationStatus.mtp.root).to.equal(revRoot);
    expect(revocationStatus.mtp.existence).to.equal(true);
    expect(revocationStatus.mtp.siblings).to.deep.equal(Array(40).fill(BigNumber.from(0)));
    expect(revocationStatus.mtp.index).to.equal(nonce);
    expect(revocationStatus.mtp.value).to.equal(0);
    expect(revocationStatus.mtp.auxExistence).to.equal(false);
    expect(revocationStatus.mtp.auxIndex).to.equal(0);
    expect(revocationStatus.mtp.auxValue).to.equal(0);
  });

  it("should return the revocation status many leafs", async function () {
    const id = 0;
    const nonce = 2n;
    const leaf1 = 4n;
    const leaf2 = nonce;

    const leaf1hash = poseidon.hash([leaf1, 0n, 1n]);
    const leaf2hash = poseidon.hash([leaf2, 0n, 1n]);
    const middleNodeHash = poseidon.hash([leaf1hash, leaf2hash]);
    const revRoot = poseidon.hash([middleNodeHash, 0n]);
    const state = poseidon.hash([1n, revRoot, 3n]);

    const preimages = [
      [leaf1, 0n, 1n], // leaf
      [leaf2, 0n, 1n], // leaf
      [leaf1hash, leaf2hash], // middle node
      [middleNodeHash, 0n], // root
      [1n, revRoot, 3n], // state
    ];

    await onchainIdentityTreeStore.addNodes(preimages);

    const revocationStatus = await onchainIdentityTreeStore.getRevocationStatusByIdAndState(
      id,
      state,
      nonce
    );

    expect(revocationStatus.issuer.state).to.equal(state);
    expect(revocationStatus.issuer.claimsTreeRoot).to.equal(1);
    expect(revocationStatus.issuer.revocationTreeRoot).to.equal(revRoot);
    expect(revocationStatus.issuer.rootOfRoots).to.equal(3);

    expect(revocationStatus.mtp.root).to.equal(revRoot);
    expect(revocationStatus.mtp.existence).to.equal(true);
    expect(revocationStatus.mtp.siblings).to.deep.equal(
      [
        BigNumber.from(0),
        BigNumber.from(
          "6949980352176809960902782436662588039414117260217395356682829284808595441653"
        ),
      ].concat(Array(38).fill(BigNumber.from(0)))
    );
    expect(revocationStatus.mtp.index).to.equal(nonce);
    expect(revocationStatus.mtp.value).to.equal(0);
    expect(revocationStatus.mtp.auxExistence).to.equal(false);
    expect(revocationStatus.mtp.auxIndex).to.equal(0);
    expect(revocationStatus.mtp.auxValue).to.equal(0);
  });

  it("Should revert on invalid roots length", async function () {
    const preimages = [[1n, 2n]];
    await onchainIdentityTreeStore.addNodes(preimages);
    const state = poseidon.hash(preimages[0]);
    const nonce = 12345;

    await expect(
      onchainIdentityTreeStore.getRevocationStatusByIdAndState(0, state, nonce)
    ).to.be.revertedWith("Invalid roots length");
  });
});
