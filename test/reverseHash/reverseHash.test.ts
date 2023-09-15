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

  it("Should save and get preimages", async function () {
    const preimages: bigint[][] = [
      [2n, 3n],
      [5n, 6n],
      [10n, 11n, 12n],
    ];

    await reverseHashWrapper.savePreimages(preimages);

    for (let i = 0; i < preimages.length; i++) {
      const hash = await poseidon.hash(preimages[i]);
      const retrievedPreimage = await reverseHashWrapper.getPreimage(hash);
      for (let j = 0; j < preimages[i].length; j++) {
        expect(retrievedPreimage[j]).to.equal(preimages[i][j]);
      }
    }
  });
});
