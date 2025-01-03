import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { packZKProof } from "../../utils/packData";
import { packLinkedMultiQueryValidatorParams } from "../../utils/validator-pack-utils";
import { expect } from "chai";

describe("Test linkedMultiQuery10.circom", function () {
  let validator;
  let signer;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    const groth16Verifier = await ethers.deployContract("Groth16VerifierValidatorStub");
    const validator = await ethers.deployContract("LinkedMultiQueryValidator");
    await validator.initialize(await groth16Verifier.getAddress(), signer.address);
    return { validator };
  }

  beforeEach(async () => {
    ({ validator } = await loadFixture(deployContractsFixture));
  });

  it("should work", async function () {
    const linkId = "1";
    const merklized = "1";
    const operatorOutput1 = "1";
    const operatorOutput2 = "16";
    const queryHash1 = "100";
    const queryHash2 = "200";

    const inputs = [linkId, merklized]
      .concat([operatorOutput1, operatorOutput2])
      .concat(Array(8).fill("0"))
      .concat([queryHash1, queryHash2])
      .concat(Array(8).fill("0"));

    const proof = packZKProof(
      inputs,
      ["0", "0"],
      [
        ["0", "0"],
        ["0", "0"],
      ],
      ["0", "0"],
    );

    const query = {
      claimPathKey: [0, 0],
      operator: [operatorOutput1, operatorOutput2],
      slotIndex: [0, 0],
      value: [
        [0, 0],
        [0, 0],
      ],
      queryHash: [queryHash1, queryHash2],
      circuitIds: [""],
      groupID: 1,
      verifierID: 1,
    };

    const data = packLinkedMultiQueryValidatorParams(query);
    const stateAddress = ethers.ZeroAddress;

    expect(await validator.verify(proof, data, signer.address, stateAddress)).not.to.throw;
  });
});
