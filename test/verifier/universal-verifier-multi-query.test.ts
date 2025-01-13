import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Contract } from "ethers";
import proofJson from "../validators/sig/data/valid_sig_user_genesis.json";
import { buildCrossChainProofs, packCrossChainProofs, packZKProof } from "../utils/packData";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";

describe("Universal Verifier Multi-request", function () {
  let verifier: any, v3Validator: any, authV2Validator: any, v3_2Validator: any;
  let signer;
  let signerAddress: string;
  let deployHelper: DeployHelper;
  let stateCrossChainStub, crossChainProofValidatorStub: Contract;

  const globalStateMessage = {
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    idType: "0x01A1",
    root: 0n,
    replacedAtTimestamp: 0n,
  };

  const identityStateMessage1 = {
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    id: 25530185136167283063987925153802803371825564143650291260157676786685420033n,
    state: 4595702004868323299100310062178085028712435650290319955390778053863052230284n,
    replacedAtTimestamp: 0n,
  };

  const identityStateUpdate2 = {
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    id: 25530185136167283063987925153802803371825564143650291260157676786685420033n,
    state: 16775015541053109108201708100382933592407720757224325883910784163897594100403n,
    replacedAtTimestamp: 1724858009n,
  };

  const value = ["20010101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 2;
  const claimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";
  const [merklized, isRevocationChecked, valueArrSize] = [1, 1, 1];
  const nullifierSessionId = "0";
  let verifierId;
  let queryHash: any;
  let requestQuery1: any;
  let requestQuery2: any;
  let requestQuery3: any;

  const storageFields = [
    {
      name: "userID",
      value: 1,
    },
    {
      name: "issuerID",
      value: 2,
    },
  ];

  const authStorageFields = [
    {
      name: "userID",
      value: 1,
    },
  ];

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    crossChainProofValidatorStub = await deployHelper.deployCrossChainProofValidator();

    const { state } = await deployHelper.deployStateWithLibraries(["0x01A1", "0x0102"]);
    await state.setCrossChainProofValidator(crossChainProofValidatorStub);
    stateCrossChainStub = state;

    const verifierLib = await deployHelper.deployVerifierLib();

    verifier = await deployHelper.deployUniversalVerifier(
      signer,
      await stateCrossChainStub.getAddress(),
      await verifierLib.getAddress(),
    );

    verifierId = await verifier.getVerifierID();

    queryHash = calculateQueryHashV3(
      value,
      schema,
      slotIndex,
      operator,
      claimPathKey,
      valueArrSize,
      merklized,
      isRevocationChecked,
      verifierId,
      nullifierSessionId,
    );

    requestQuery1 = {
      schema,
      claimPathKey,
      operator,
      slotIndex,
      value,
      // we can use the same offchain circuit id because now an auth request is used for authentication
      circuitIds: [CircuitId.AuthV2],
      skipClaimRevocationCheck: false,
      queryHash,
      groupID: 0,
      nullifierSessionID: nullifierSessionId, // for ethereum based user
      proofType: 1, // 1 for BJJ
      verifierID: verifierId,
    };

    requestQuery2 = {
      schema,
      claimPathKey,
      operator,
      slotIndex,
      value,
      circuitIds: [CircuitId.AtomicQueryV3],
      skipClaimRevocationCheck: false,
      queryHash,
      groupID: 1,
      nullifierSessionID: nullifierSessionId, // for ethereum based user
      proofType: 1, // 1 for BJJ
      verifierID: verifierId,
    };

    requestQuery3 = {
      schema,
      claimPathKey,
      operator,
      slotIndex,
      value,
      circuitIds: [CircuitId.AtomicQueryV3],
      skipClaimRevocationCheck: false,
      queryHash,
      groupID: 1,
      nullifierSessionID: nullifierSessionId, // for ethereum based user
      proofType: 1, // 1 for BJJ
      verifierID: verifierId,
    };

    v3Validator = await deployHelper.deployValidatorStub("RequestValidatorV3Stub");
    v3_2Validator = await deployHelper.deployValidatorStub("RequestValidatorV3_2Stub");
    authV2Validator = await deployHelper.deployValidatorStub("AuthValidatorStub");

    await verifier.addValidatorToWhitelist(await v3Validator.getAddress());
    await verifier.addValidatorToWhitelist(await v3_2Validator.getAddress());
    await verifier.connect();
  }

  async function checkStorageFields(verifier: any, requestId: bigint, storageFields: any[]) {
    for (const field of storageFields) {
      const value = await verifier.getResponseFieldValue(
        requestId,
        await signer.getAddress(),
        field.name,
      );
      expect(value).to.be.equal(field.value);
    }
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("Test submit response multi-request without groupID", async () => {
    const requestId = 1;
    const multiRequestId = 1;
    const nonExistingMultiRequestId = 5;
    const authType = "authV2";
    const params = packV3ValidatorParams(requestQuery1);

    const txSetRequests = await verifier.setRequests([
      {
        requestId: requestId,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: params,
      },
    ]);
    await txSetRequests.wait();

    let requestStored = await verifier.getRequest(requestId);
    // check if the request is stored correctly checking metadata and validator
    expect(requestStored.metadata).to.be.equal("metadata");
    expect(requestStored.validator).to.be.equal(await v3Validator.getAddress());
    expect(requestStored.params).to.be.equal(params);
    expect(requestStored.creator).to.be.equal(await signer.getAddress());
    expect(requestStored.verifierId).to.be.equal(verifierId);

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: params,
    });
    const authRequestStored = await verifier.getAuthType(authType);
    expect(authRequestStored.validator).to.be.equal(await authV2Validator.getAddress());
    expect(authRequestStored.params).to.be.equal(params);
    expect(authRequestStored.isActive).to.be.equal(true);

    const multiRequest = {
      multiRequestId,
      requestIds: [requestId],
      groupIds: [],
      metadata: "0x",
    };
    const txSetMultiRequest = await verifier.setMultiRequest(multiRequest);
    await txSetMultiRequest.wait();
    const multiRequestStored = await verifier.getMultiRequest(multiRequestId);
    expect(multiRequestStored.multiRequestId).to.be.equal(multiRequestId);
    expect(multiRequestStored.requestIds).to.be.deep.equal(multiRequest.requestIds);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = packCrossChainProofs(
      await buildCrossChainProofs(
        [globalStateMessage, identityStateMessage1, identityStateUpdate2],
        signer,
      ),
    );

    const metadatas = "0x";

    const tx = await verifier.submitResponse(
      {
        authType: authType,
        proof,
      },
      [
        {
          requestId,
          proof,
          metadata: metadatas,
        },
      ],
      crossChainProofs,
    );

    await tx.wait();

    await checkStorageFields(verifier, BigInt(requestId), storageFields);

    const filter = verifier.filters.ResponseSubmitted;
    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ResponseSubmitted");
    expect(events[0].args.requestId).to.be.equal(requestId);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    await expect(
      verifier.getMultiRequestStatus(nonExistingMultiRequestId, signerAddress),
    ).to.be.rejectedWith(`MultiRequestIdNotFound(${nonExistingMultiRequestId})`);

    const isMultiRequestVerified = await verifier.isMultiRequestVerified(
      multiRequestId,
      signerAddress,
    );
    expect(isMultiRequestVerified).to.be.equal(true);

    const status = await verifier.getMultiRequestStatus(multiRequestId, signerAddress);
    expect(status[0].requestId).to.be.equal(requestId);
    expect(status[0].isVerified).to.be.equal(true); // request isVerified

    requestStored = await verifier.getRequest(requestId);
    // check if validator is authenticated
    // TODO reorg the tests to decouple validator from user
  });

  it("Test submit response multi-request with same groupID and linkID", async () => {
    const requestId2 = 2;
    const requestId3 = 3;
    const groupId = 1;
    const authType = "authV2";
    const multiRequestId = 1;
    const nonExistingMultiRequestId = 5;
    const authParams = "0x";
    const paramsRequest2 = packV3ValidatorParams(requestQuery2);
    const paramsRequest3 = packV3ValidatorParams(requestQuery3);

    const txSetRequests = await verifier.setRequests([
      {
        requestId: requestId2,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: paramsRequest2,
      },
      {
        requestId: requestId3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: paramsRequest3,
      },
    ]);
    await txSetRequests.wait();

    const requestStored = await verifier.getRequest(requestId2);
    // check if the request is stored correctly checking metadata and validator
    expect(requestStored.metadata).to.be.equal("metadata");
    expect(requestStored.validator).to.be.equal(await v3Validator.getAddress());
    expect(requestStored.params).to.be.equal(paramsRequest2);
    expect(requestStored.creator).to.be.equal(await signer.getAddress());
    expect(requestStored.verifierId).to.be.equal(verifierId);

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: authParams,
    });
    const authRequestStored = await verifier.getAuthType(authType);
    expect(authRequestStored.validator).to.be.equal(await authV2Validator.getAddress());
    expect(authRequestStored.params).to.be.equal(authParams);
    expect(authRequestStored.isActive).to.be.equal(true);

    const multiRequest = {
      multiRequestId,
      requestIds: [],
      groupIds: [groupId],
      metadata: "0x",
    };
    const txSetMultiRequest = await verifier.setMultiRequest(multiRequest);
    await txSetMultiRequest.wait();

    const multiRequestStored = await verifier.getMultiRequest(multiRequestId);
    expect(multiRequestStored[0]).to.be.equal(multiRequestId);
    expect(multiRequestStored[1]).to.be.deep.equal(multiRequest.requestIds);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = packCrossChainProofs(
      await buildCrossChainProofs(
        [globalStateMessage, identityStateMessage1, identityStateUpdate2],
        signer,
      ),
    );

    const metadatas = "0x";

    const tx = await verifier.submitResponse(
      {
        authType: authType,
        proof,
      },
      [
        { requestId: requestId2, proof, metadata: metadatas },
        { requestId: requestId3, proof, metadata: metadatas },
      ],
      crossChainProofs,
    );
    await tx.wait();

    await checkStorageFields(verifier, BigInt(requestId2), storageFields);
    await checkStorageFields(verifier, BigInt(requestId3), storageFields);

    const filter = verifier.filters.ResponseSubmitted;
    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ResponseSubmitted");
    expect(events[0].args.requestId).to.be.equal(requestId2);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    await expect(
      verifier.getMultiRequestStatus(nonExistingMultiRequestId, signerAddress),
    ).to.be.rejectedWith(`MultiRequestIdNotFound(${nonExistingMultiRequestId})`);

    const isMultiRequestVerified = await verifier.isMultiRequestVerified(
      multiRequestId,
      signerAddress,
    );
    expect(isMultiRequestVerified).to.be.equal(true);

    const status = await verifier.getMultiRequestStatus(multiRequestId, signerAddress);
    expect(status[0].isVerified).to.be.equal(true); // requestId2 isVerified
    expect(status[1].requestId).to.be.equal(requestId3);
    expect(status[1].isVerified).to.be.equal(true); // requestId3 isVerified
  });

  it("Test submit response multi-request with same groupID and different linkID", async () => {
    const requestId2 = 2;
    const requestId3 = 3;
    const groupId = 1;
    const authType = "authV2";
    const multiRequestId = 1;
    const authParams = "0x";
    const paramsRequest2 = packV3ValidatorParams(requestQuery2);
    const paramsRequest3 = packV3ValidatorParams(requestQuery3);

    const txSetRequests = await verifier.setRequests([
      {
        requestId: requestId2,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: paramsRequest2,
      },
      {
        requestId: requestId3,
        metadata: "metadata",
        validator: await v3_2Validator.getAddress(),
        params: paramsRequest3,
      },
    ]);
    await txSetRequests.wait();

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: authParams,
    });

    const multiRequest = {
      multiRequestId,
      requestIds: [],
      groupIds: [groupId],
      metadata: "0x",
    };
    const txSetMultiRequest = await verifier.setMultiRequest(multiRequest);
    await txSetMultiRequest.wait();

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = packCrossChainProofs(
      await buildCrossChainProofs(
        [globalStateMessage, identityStateMessage1, identityStateUpdate2],
        signer,
      ),
    );

    const metadatas = "0x";
    const tx = await verifier.submitResponse(
      {
        authType: authType,
        proof,
      },
      [
        { requestId: requestId2, proof, metadata: metadatas },
        { requestId: requestId3, proof, metadata: metadatas },
      ],
      crossChainProofs,
    );
    await tx.wait();

    await expect(verifier.getMultiRequestStatus(multiRequestId, signerAddress)).to.be.rejectedWith(
      "LinkIDNotTheSameForGroupedRequests()",
    );
  });
});
