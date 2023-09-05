import { ethers } from "hardhat";
import { deployPoseidons } from "../helpers/PoseidonDeployHelper";
import { expect } from "chai";

function calculateKeccak256Hash(preimage: number[]): string {
  const keccak256 = ethers.utils.keccak256;
  const packedData = ethers.utils.solidityPack(["uint256[]"], [preimage]);
  return keccak256(packedData);
}

(async () => {
  const [owner] = await ethers.getSigners();
  const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(owner, [2, 3]);

  const OnchainIdentityTreeStore = await ethers.getContractFactory(
    "OnchainIdentityTreeStore", {
      libraries: {
        PoseidonUnit2L: poseidon2Elements.address,
        PoseidonUnit3L: poseidon3Elements.address,
      }
    }
  );
  const onchainIdentityTreeStore = await OnchainIdentityTreeStore.deploy();
  await onchainIdentityTreeStore.deployed();
  console.log("OnchainIdentityTreeStore deployed to:", onchainIdentityTreeStore.address);

  const preimage = [2, 3, 4];
  const hash = calculateKeccak256Hash(preimage);

  await onchainIdentityTreeStore.addNode(preimage);
  const retrievedPreimage = await onchainIdentityTreeStore.getNode(
    "19392314395028218855071922567043158305035792433175725594195224138645494498149"
  );

  for (let i = 0; i < retrievedPreimage.length; i++) {
    expect(retrievedPreimage[i]).to.equal(preimage[i]);
  }

  console.log("Hash: ", hash);
  console.log("Preimage: ", retrievedPreimage.toString());
})();
