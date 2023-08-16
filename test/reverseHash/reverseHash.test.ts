import { ethers } from "hardhat";
import { expect } from "chai";
import { ReverseHashWrapper } from "../typechain/ReverseHashWrapper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";

function calculateKeccak256Hash(preimage: number[]): string {
  const keccak256 = ethers.utils.keccak256;
  const packedData = ethers.utils.solidityPack(["uint256[]"], [preimage]);
  return keccak256(packedData);
}

describe("ReverseHashWrapper", function () {
  let reverseHashWrapper: ReverseHashWrapper;

  beforeEach(async function () {
    const [owner] = await ethers.getSigners();
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(owner, [2, 3]);

    const ReverseHashWrapperFactory = await ethers.getContractFactory(
      "ReverseHashWrapper", {
        libraries: {
          PoseidonUnit2L: poseidon2Elements.address,
          PoseidonUnit3L: poseidon3Elements.address,
        }
      }
    );
    reverseHashWrapper = await ReverseHashWrapperFactory.deploy();
    await reverseHashWrapper.deployed();
  });

  it("should add and retrieve a preimage", async function () {
    const preimage = [2, 3, 4];
    const hash = calculateKeccak256Hash(preimage);

    await reverseHashWrapper.addPreimage(preimage);
    const retrievedPreimage = await reverseHashWrapper.getPreimage(hash);

    for (let i = 0; i < retrievedPreimage.length; i++) {
      expect(retrievedPreimage[i]).to.equal(preimage[i]);
    }
  });

  it("should add many nodes", async function () {
    const preimageBulk = [
      [2, 3],
      [5, 6],
      [8, 9],
      [10, 11],
      [12, 13],
      [14, 15],
      [16, 17],
      [18, 19],
      [20, 21],
      [22, 23],
      [24, 25],
      [26, 27],
      [28, 29],
      [30, 31],
      [32, 33],
      [34, 35],
      [36, 37],
      [38, 39],
      [40, 41],
      [10, 11, 12],
    ];

    await reverseHashWrapper.addPreimageBulk(preimageBulk);

    for (let i = 0; i < preimageBulk.length; i++) {
      const hash = await calculateKeccak256Hash(preimageBulk[i]);
      const retrievedPreimage = await reverseHashWrapper.getPreimage(hash);
      for (let j = 0; j < retrievedPreimage.length; j++) {
        expect(retrievedPreimage[j]).to.equal(preimageBulk[i][j]);
      }
    }
  });
});
