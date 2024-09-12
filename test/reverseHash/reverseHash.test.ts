import { ethers } from "hardhat";
import { expect } from "chai";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { poseidon } from "@iden3/js-crypto";

describe("ReverseHashWrapper", function () {
  let reverseHashWrapper;

  beforeEach(async function () {
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3]);

    const ReverseHashWrapperFactory = await ethers.getContractFactory(
      "ReverseHashWrapper", {
        libraries: {
          PoseidonUnit2L: await poseidon2Elements.getAddress(),
          PoseidonUnit3L: await poseidon3Elements.getAddress(),
        }
      }
    );
    reverseHashWrapper = await ReverseHashWrapperFactory.deploy();
    await reverseHashWrapper.waitForDeployment();
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
