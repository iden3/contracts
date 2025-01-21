import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { packZKProof } from "../../utils/packData";
import { packLinkedMultiQueryValidatorParams } from "../../utils/validator-pack-utils";
import { expect } from "chai";
import { contractsInfo } from "../../../helpers/constants";

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

  it("check version", async () => {
    const version = await validator.version();
    expect(version).to.be.equal(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.version);
  });

  it("check getRequestParams", async () => {
    const query: any = {
      claimPathKey: [1, 2],
      operator: [2, 3],
      slotIndex: [0],
      value: [
        [20020101, ...new Array(63).fill(0)],
        [20030101, ...new Array(63).fill(0)],
      ],
      queryHash: [3, 4],
      circuitIds: ["circuitName"],
      groupID: 4,
      verifierID: 5,
    };

    const params = packLinkedMultiQueryValidatorParams(query);
    const requestParams = await validator.getRequestParams(params);
    expect(requestParams.groupID).to.be.equal(4);
    expect(requestParams.verifierID).to.be.equal(5);
    expect(requestParams.nullifierSessionID).to.be.equal(0);
  });
});
