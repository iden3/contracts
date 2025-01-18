import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { packZKProof } from "../../utils/packData";
import { packLinkedMultiQueryValidatorParams } from "../../utils/validator-pack-utils";
import { expect } from "chai";

describe("Test linkedMultiQuery10.circom", function () {
  let validator;
  let signer;

  const linkId = "1";
  const merklized = "1";
  const operator1 = "1";
  const operator2 = "16";
  const operatorOutput1 = "0";
  const operatorOutput2 = "777";
  const queryHash1 = "100";
  const queryHash2 = "200";

  const proofForOneQuery = [linkId, merklized]
    .concat([operatorOutput1, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    .concat([queryHash1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const proofForTwoQueries = [linkId, merklized]
    .concat([operatorOutput1, operatorOutput2, 0, 0, 0, 0, 0, 0, 0, 0])
    .concat([queryHash1, queryHash2, 0, 0, 0, 0, 0, 0, 0, 0]);

  const dummyZKProof = [
    ["0", "0"],
    [
      ["0", "0"],
      ["0", "0"],
    ],
    ["0", "0"],
  ];

  const oneQuery = {
    claimPathKey: [0, 0],
    operator: [operator1],
    slotIndex: [0, 0],
    value: [
      [0, 0],
      [0, 0],
    ],
    queryHash: [queryHash1],
    circuitIds: ["someWrongCircuitId"],
    groupID: 1,
    verifierID: 1,
  };

  const twoQueries = {
    claimPathKey: [0, 0],
    operator: [operator1, operator2],
    slotIndex: [0, 0],
    value: [
      [0, 0],
      [0, 0],
    ],
    queryHash: [queryHash1, queryHash2],
    circuitIds: ["linkedMultiQuery10"],
    groupID: 1,
    verifierID: 1,
  };

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

  it("Should verify", async function () {
    const proof = packZKProof(proofForTwoQueries, ...dummyZKProof);
    const data = packLinkedMultiQueryValidatorParams(twoQueries);
    const stateAddress = ethers.ZeroAddress;

    const result = await validator.verify(proof, data, signer.address, stateAddress);
    expect(result).to.deep.equal([
      ["linkID", linkId],
      ["operatorOutput1", 777n],
    ]);

    // have more than one operator output
  });

  it("Should throw if circuitId is not linkedMultiQuery10", async function () {
    const proof = packZKProof(proofForOneQuery, ...dummyZKProof);
    const data = packLinkedMultiQueryValidatorParams(oneQuery);
    const stateAddress = ethers.ZeroAddress;

    await expect(validator.verify(proof, data, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "WrongCircuitID")
      .withArgs("someWrongCircuitId");
  });

  it("More than 10 queries should throw", async function () {
    const proof = packZKProof(proofForOneQuery, ...dummyZKProof);
    const data = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      queryHash: Array(11).fill(queryHash1),
    });
    const stateAddress = ethers.ZeroAddress;

    await expect(validator.verify(proof, data, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "TooManyQueries")
      .withArgs(11);
  });

  it("Should throw if wrong query hash", async function () {
    const proof = packZKProof(proofForOneQuery, ...dummyZKProof);
    const data = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      queryHash: [queryHash2],
    });
    const stateAddress = ethers.ZeroAddress;

    await expect(validator.verify(proof, data, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "InvalidQueryHash")
      .withArgs(queryHash2, queryHash1);
  });

  // getRequestParams should return the correct values
  // Maybe: make programmable groth16 verifier stub and throw error
  // Should throw if groupID is 0
});
