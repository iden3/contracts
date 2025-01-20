import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { packZKProof } from "../../utils/packData";
import { packLinkedMultiQueryValidatorParams } from "../../utils/validator-pack-utils";
import { expect } from "chai";

describe("Test linkedMultiQuery10.circom", function () {
  let validator, groth16Verifier;
  let signer;

  const stateAddress = ethers.ZeroAddress;

  const linkId = "1";
  const merklized = "1";
  const operator1 = "1";
  const operator2 = "16";
  const operatorOutput1 = "0";
  const operatorOutput2 = "777";
  const queryHash1 = "100";
  const queryHash2 = "200";

  const dummyZKProof = [
    ["0", "0"],
    [
      ["0", "0"],
      ["0", "0"],
    ],
    ["0", "0"],
  ];

  const proofForOneQuery = packZKProof(
    [linkId, merklized]
      .concat([operatorOutput1, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      .concat([queryHash1, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ...dummyZKProof,
  );

  const proofForTwoQueries = packZKProof(
    [linkId, merklized]
      .concat([operatorOutput1, operatorOutput2, 0, 0, 0, 0, 0, 0, 0, 0])
      .concat([queryHash1, queryHash2, 0, 0, 0, 0, 0, 0, 0, 0]),
    ...dummyZKProof,
  );

  const oneQuery = {
    claimPathKey: [0, 0],
    operator: [operator1],
    slotIndex: [0, 0],
    value: [
      [0, 0],
      [0, 0],
    ],
    queryHash: [queryHash1],
    circuitIds: ["linkedMultiQuery10"],
    groupID: 1,
    verifierID: 1,
  };

  const oneQueryParams = packLinkedMultiQueryValidatorParams(oneQuery);

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

  const twoQueriesParams = packLinkedMultiQueryValidatorParams(twoQueries);

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    const groth16Verifier = await ethers.deployContract("Groth16VerifierValidatorStub");
    const validator = await ethers.deployContract("LinkedMultiQueryValidator");
    await validator.initialize(await groth16Verifier.getAddress());
    return { validator, groth16Verifier };
  }

  beforeEach(async () => {
    ({ validator, groth16Verifier } = await loadFixture(deployContractsFixture));
  });

  it("Should verify", async function () {
    const result = await validator.verify(proofForTwoQueries, twoQueriesParams, signer.address, stateAddress);
    expect(result).to.deep.equal([
      ["linkID", linkId],
      ["operatorOutput1", 777n],
    ]);

    // have more than one operator output
  });

  it("Should throw if circuitId is not linkedMultiQuery10", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      circuitIds: ["someWrongCircuitId"],
    });

    await expect(validator.verify(proofForOneQuery, params, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "WrongCircuitID")
      .withArgs("someWrongCircuitId");
  });

  it("More than 10 queries in request params should throw", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      queryHash: Array(11).fill(queryHash1),
    });

    await expect(validator.verify(proofForOneQuery, params, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "TooManyQueries")
      .withArgs(11);
  });

  it("Should throw if wrong query hash", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      queryHash: [queryHash2],
    });

    await expect(validator.verify(proofForOneQuery, params, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "InvalidQueryHash")
      .withArgs(queryHash2, queryHash1);
  });

  it("Should throw if groupID is 0", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      groupID: 0,
    });

    await expect(validator.verify(proofForOneQuery, params, signer.address, stateAddress))
      .to.be.revertedWithCustomError(validator, "InvalidGroupID")
      .withArgs(0);
  });

  it("getRequestParams should return the correct values", async function () {
    const result = await validator.getRequestParams(oneQueryParams);
    expect(result).to.deep.equal([oneQuery.groupID, oneQuery.verifierID, 0]);
  });

  it("Should throw if failed ZK verification", async function () {
    await groth16Verifier.stub_setVerifyResult(false);

    await expect(
      validator.verify(proofForOneQuery, oneQueryParams, signer.address, stateAddress),
    ).to.be.revertedWithCustomError(validator, "InvalidGroth16Proof");
  });

  it("Contract version should be 1.0.0-beta", async function () {
    expect(await validator.VERSION()).to.equal("1.0.0-beta");
    expect(await validator.version()).to.equal("1.0.0-beta");
  });
});
