import { packZKProof } from "../../utils/packData";
import { packLinkedMultiQueryValidatorParams } from "../../utils/validator-pack-utils";
import { expect } from "chai";
import { contractsInfo } from "../../../helpers/constants";
import { network } from "hardhat";
import { LinkedMultiQueryStable3ValidatorWithGroth16VerifierStubModule } from "../../../ignition/modules/deployEverythingBasicStrategy/testHelpers";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("Test linkedMultiQuery.circom", function () {
  let validator, groth16Verifier;
  let signer;

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
  ] as any;

  const proofForOneQuery = packZKProof(
    [linkId, merklized]
      .concat([operatorOutput1, "0", "0"])
      .concat([queryHash1, "0", "0"]),
    dummyZKProof[0],
    dummyZKProof[1],
    dummyZKProof[2],
  );

  const proofForTwoQueries = packZKProof(
    [linkId, merklized]
      .concat([operatorOutput1, operatorOutput2, "0"])
      .concat([queryHash1, queryHash2, "0"]),
    dummyZKProof[0],
    dummyZKProof[1],
    dummyZKProof[2],
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
    circuitIds: ["linkedMultiQuery3"],
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
    circuitIds: ["linkedMultiQuery3"],
    groupID: 1,
    verifierID: 1,
  };

  const twoQueriesParams = packLinkedMultiQueryValidatorParams(twoQueries);

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();

    ({
      linkedMultiQueryValidatorStable3: validator,
      groth16VerifierValidatorStub: groth16Verifier,
    } = await ignition.deploy(LinkedMultiQueryStable3ValidatorWithGroth16VerifierStubModule));

    return { validator, groth16Verifier };
  }

  beforeEach(async () => {
    ({ validator, groth16Verifier } = await networkHelpers.loadFixture(deployContractsFixture));
  });

  it("Should verify", async function () {
    const result = await validator.verify(
      signer.address,
      proofForTwoQueries,
      twoQueriesParams,
      "0x",
    );
    expect(result).to.deep.equal([
      ["linkID", linkId, "0x"],
      ["operatorOutput_1", 777n, "0x"],
    ]);

    // have more than one operator output
  });

  it("Should throw if circuitId is not linkedMultiQuery", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      circuitIds: ["someWrongCircuitId"],
    });

    await expect(validator.verify(signer.address, proofForOneQuery, params, "0x"))
      .to.be.revertedWithCustomError(validator, "WrongCircuitID")
      .withArgs("someWrongCircuitId");
  });

  it("More than 5 queries in request params should throw", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      queryHash: Array(6).fill(queryHash1),
    });

    await expect(validator.verify(signer.address, proofForOneQuery, params, "0x"))
      .to.be.revertedWithCustomError(validator, "TooManyQueries")
      .withArgs(6);
  });

  it("Should throw if wrong query hash", async function () {
    const params = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      queryHash: [queryHash2],
    });

    await expect(validator.verify(signer.address, proofForOneQuery, params, "0x"))
      .to.be.revertedWithCustomError(validator, "InvalidQueryHash")
      .withArgs(queryHash2, queryHash1);
  });

  it("Should throw if groupID or linkID is 0", async function () {
    const paramsWithZeroGroupID = packLinkedMultiQueryValidatorParams({
      ...oneQuery,
      groupID: 0,
    });

    await expect(
      validator.verify(signer.address, proofForOneQuery, paramsWithZeroGroupID, "0x"),
    ).to.be.revertedWithCustomError(validator, "GroupIDCannotBeZero");

    const proofForOneQueryWithZeroLinkID = packZKProof(
      ["0", merklized]
        .concat([operatorOutput1, "0", "0"])
        .concat([queryHash1, "0", "0"]),
      dummyZKProof[0],
      dummyZKProof[1],
      dummyZKProof[2],
    );

    await expect(
      validator.verify(signer.address, proofForOneQueryWithZeroLinkID, oneQueryParams, "0x"),
    ).to.be.revertedWithCustomError(validator, "LinkIDCannotBeZero");
  });

  it("getRequestParam should return the correct values", async function () {
    let resultParam = await validator.getRequestParam(oneQueryParams, "groupID");
    expect(resultParam).to.deep.equal(["groupID", oneQuery.groupID]);
    resultParam = await validator.getRequestParam(oneQueryParams, "verifierID");
    expect(resultParam).to.deep.equal(["verifierID", oneQuery.verifierID]);
    resultParam = await validator.getRequestParam(oneQueryParams, "nullifierSessionID");
    expect(resultParam).to.deep.equal(["nullifierSessionID", 0]);
  });

  it("Should throw if failed ZK verification", async function () {
    await groth16Verifier.stub_setVerifyResult(false);

    await expect(
      validator.verify(signer.address, proofForOneQuery, oneQueryParams, "0x"),
    ).to.be.revertedWithCustomError(validator, "InvalidGroth16Proof");
  });

  it("Check contract version", async function () {
    expect(await validator.VERSION()).to.equal(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.version,
    );
    expect(await validator.version()).to.equal(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.version,
    );
  });

  it("check getRequestParam", async () => {
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

    let resultParam = await validator.getRequestParam(params, "groupID");
    expect(resultParam).to.deep.equal(["groupID", 4]);
    resultParam = await validator.getRequestParam(params, "verifierID");
    expect(resultParam).to.deep.equal(["verifierID", 5]);
    resultParam = await validator.getRequestParam(params, "nullifierSessionID");
    expect(resultParam).to.deep.equal(["nullifierSessionID", 0]);
  });
});
