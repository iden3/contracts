import { ethers } from "hardhat";
import { expect } from "chai";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { poseidon } from "@iden3/js-crypto";

describe("ReverseHashWrapper", function () {
  let reverseHashWrapper;

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
    const preimage = [1n, 2n, 3n];
    const hash = poseidon.hash(preimage);

    await reverseHashWrapper.addPreimage(preimage);
    const retrievedPreimage = await reverseHashWrapper.getPreimage(hash);

    for (let i = 0; i < preimage.length; i++) {
      expect(retrievedPreimage[i]).to.equal(preimage[i]);
    }
  });

  it("should add many nodes", async function () {
    const preimageBulk: bigint[][] = [
      [2n, 3n],
      [5n, 6n],
      [10n, 11n, 12n],
    ];

    await reverseHashWrapper.addPreimageBulk(preimageBulk);

    for (let i = 0; i < preimageBulk.length; i++) {
      const hash = await poseidon.hash(preimageBulk[i]);
      const retrievedPreimage = await reverseHashWrapper.getPreimage(hash);
      for (let j = 0; j < preimageBulk[i].length; j++) {
        expect(retrievedPreimage[j]).to.equal(preimageBulk[i][j]);
      }
    }
  });
});
