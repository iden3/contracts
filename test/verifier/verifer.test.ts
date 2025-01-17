import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("Verifer tests", function () {
  let sender: any;
  let verifier, verifierLib, validator: any;
  let request, paramsFromValidator: any;
  let multiRequest: any;
  let signer: any;
  let signerAddress: string;
  let verifierId: any;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    const deployHelper = await DeployHelper.initialize(null, true);
    const verifierLib = await ethers.deployContract("VerifierLib");
    const verifier = await ethers.deployContract("VerifierTestWrapper", [], {
      libraries: { VerifierLib: await verifierLib.getAddress() },
    });

    const { state } = await deployHelper.deployStateWithLibraries([], "Groth16VerifierStub");
    await verifier.initialize(await state.getAddress());

    const authValidatorStub = await ethers.deployContract("AuthValidatorStub");
    await authValidatorStub.stub_setVerifyResults(1);

    const authType = {
      authType: "stubAuth",
      validator: await authValidatorStub.getAddress(),
      params: "0x",
    };
    await verifier.setAuthType(authType);

    const validator = await ethers.deployContract("RequestValidatorStub");
    return { verifier, verifierLib, validator };
  }

  describe("Single request tests", function () {
    beforeEach(async function () {
      [sender] = await ethers.getSigners();
      ({ verifier, verifierLib, validator } = await deployContractsFixture());

      verifierId = await verifier.getVerifierID();

      request = {
        requestId: 1,
        metadata: "0x",
        validator: await validator.getAddress(),
        params: "0x",
      };

      paramsFromValidator = {
        groupID: 0,
        verifierID: 0,
        nullifierSessionID: 0,
      };

      multiRequest = {
        multiRequestId: 1,
        requestIds: [request.requestId],
        groupIds: [],
        metadata: "0x",
      };
    });

    it("setRequests: nullifierSessionID may be not unique if EQUAL to 0", async function () {
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

      await verifier.setRequests([request]);
      request.requestId = 2;
      await verifier.setRequests([request]);
    });

    it("setRequests: nullifierSessionID must be unique if NOT EQUAL to 0", async function () {
      paramsFromValidator.nullifierSessionID = 1;
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

      await verifier.setRequests([request]);
      request.requestId = 2;
      await expect(verifier.setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "NullifierSessionIDAlreadyExists")
        .withArgs(1);
    });

    it("setRequests: requestId should be valid", async function () {
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

      request.requestId = BigInt(
        "0x0000000000000002FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      ); // requestId without valid prefix 0x00000000000000_00 or 0x00000000000000_01 (eigth byte)

      await expect(verifier.setRequests([request])).to.be.revertedWithCustomError(
        verifier,
        "RequestIdTypeNotValid",
      );

      request.requestId = BigInt(
        "0x0000000001000001FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      ); // requestId uses reserved bytes (firt to seventh byte) 0x00000000000000
      await expect(verifier.setRequests([request])).to.be.revertedWithCustomError(
        verifier,
        "RequestIdUsesReservedBytes",
      );

      request.requestId = BigInt(
        "0x0000000000000001FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      ); // requestId idType is valid but calculation from hash params is not valid
      await expect(verifier.setRequests([request])).to.be.revertedWithCustomError(
        verifier,
        "RequestIdNotValid",
      );

      request.requestId =
        (BigInt(ethers.keccak256(request.params)) &
          BigInt("0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")) +
        BigInt("0x0000000000000001000000000000000000000000000000000000000000000000"); // requestId is valid;
      await expect(verifier.setRequests([request])).not.to.be.rejected;
    });

    it("setRequests: a group should be formed by the groupID encoded in requests params", async function () {
      const groupID = 1;
      const groupRequest1 = { ...request, groupID };
      const groupRequest2 = { ...request, requestId: 2, groupID };
      paramsFromValidator.groupID = 1;
      await validator.stub_setRequestParams([groupRequest1.params], [paramsFromValidator]);
      await validator.stub_setRequestParams([groupRequest2.params], [paramsFromValidator]);

      let groupsCount = await verifier.getGroupsCount();
      expect(groupsCount).to.be.equal(0);

      await verifier.setRequests([groupRequest1, groupRequest2]);

      groupsCount = await verifier.getGroupsCount();
      expect(groupsCount).to.be.equal(1);

      const groupedRequests = await verifier.getGroupedRequests(groupID);
      expect(groupedRequests.length).to.be.equal(2);
      expect(groupedRequests[0]).to.be.equal(groupRequest1.requestId);
      expect(groupedRequests[1]).to.be.equal(groupRequest2.requestId);
    });

    it("getRequest: requestId should exist", async function () {
      let requestObject = verifier.getRequest(request.requestId);
      expect(requestObject)
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(request.requestId);

      paramsFromValidator.verifierID = verifierId;
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
      await verifier.setRequests([request]);
      requestObject = await verifier.getRequest(request.requestId);

      expect(requestObject.requestId).to.be.equal(request.requestId);
      expect(requestObject.metadata).to.be.equal(request.metadata);
      expect(requestObject.validator).to.be.equal(request.validator);
      expect(requestObject.params).to.be.equal(request.params);
      expect(requestObject.creator).to.be.equal(await signer.getAddress());
      expect(requestObject.verifierId).to.be.equal(verifierId);
    });

    it("getRequestStatus: requestId should exist", async function () {
      const nonExistingRequestId = 2;

      await expect(verifier.getRequestStatus(signerAddress, nonExistingRequestId))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(nonExistingRequestId);
    });

    it("submitResponse: not repeated responseFields from validator", async function () {
      await verifier.setRequests([request]);
      await validator.stub_setVerifyResults([
        {
          name: "someFieldName1",
          value: 1,
        },
        {
          name: "someFieldName2",
          value: 2,
        },
      ]);

      const authResponse = {
        authType: "stubAuth",
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";
      await verifier.submitResponse(authResponse, [response], crossChainProofs);

      const responseField1 = await verifier.getResponseFieldValue(
        request.requestId,
        sender,
        "someFieldName1",
      );
      expect(responseField1).to.be.equal(1);
      const resonseField2 = await verifier.getResponseFieldValue(
        request.requestId,
        sender,
        "someFieldName2",
      );
      expect(resonseField2).to.be.equal(2);
    });

    it("submitResponse: should throw if repeated responseFields from validator", async function () {
      await verifier.setRequests([request]);
      await validator.stub_setVerifyResults([
        {
          name: "someFieldName1",
          value: 1,
        },
        {
          name: "someFieldName1",
          value: 1,
        },
      ]);

      const authResponse = {
        authType: "stubAuth",
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";
      await expect(verifier.submitResponse(authResponse, [response], crossChainProofs))
        .to.revertedWithCustomError(verifierLib, "ResponseFieldAlreadyExists")
        .withArgs("someFieldName1");
    });

    it("submitResponse: userID in response fields should match auth userID", async function () {
      await verifier.setRequests([request]);

      let userID = 1; // we assume that userID is hardcoded to 1 in the auth stub contract
      await validator.stub_setVerifyResults([
        {
          name: "userID",
          value: userID,
        },
      ]);

      const authResponse = {
        authType: "stubAuth",
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      await verifier.submitResponse(authResponse, [response], crossChainProofs);

      userID = 2;
      await validator.stub_setVerifyResults([
        {
          name: "userID",
          value: userID,
        },
      ]);

      await expect(verifier.submitResponse(authResponse, [response], crossChainProofs))
        .to.revertedWithCustomError(verifier, "UserIDMismatch")
        .withArgs(1, 2);
    });
  });

  describe("Multi request tests", function () {
    before(async function () {
      [sender] = await ethers.getSigners();
      ({ verifier, validator } = await deployContractsFixture());

      request = {
        requestId: 1,
        metadata: "0x",
        validator: await validator.getAddress(),
        params: "0x",
      };

      paramsFromValidator = {
        groupID: 0,
        verifierID: 0,
        nullifierSessionID: 0,
      };

      multiRequest = {
        multiRequestId: 1,
        requestIds: [request.requestId],
        groupIds: [],
        metadata: "0x",
      };
    });

    it("setMultiRequest: multi request should not exist", async function () {
      await verifier.setRequests([request]);

      await verifier.setMultiRequest(multiRequest);
      await expect(verifier.setMultiRequest(multiRequest))
        .revertedWithCustomError(verifier, "MultiRequestIdAlreadyExists")
        .withArgs(multiRequest.multiRequestId);
    });

    it("setMultiRequest: check statuses of two different multiRequests pointing to the same requests", async function () {
      const multiRequest2 = { ...multiRequest, multiRequestId: 2 };
      await verifier.setMultiRequest(multiRequest2);

      let isMultiRequestVerified = await verifier.isMultiRequestVerified(
        multiRequest.multiRequestId,
        signerAddress,
      );
      expect(isMultiRequestVerified).to.be.false;

      let isMultiRequest2Verified = await verifier.isMultiRequestVerified(
        multiRequest2.multiRequestId,
        signerAddress,
      );
      expect(isMultiRequest2Verified).to.be.false;

      const userID = 1; // we assume that userID is hardcoded to 1 in the auth stub contract
      await validator.stub_setVerifyResults([
        {
          name: "userID",
          value: userID,
        },
      ]);

      const authResponse = {
        authType: "stubAuth",
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      await verifier.submitResponse(authResponse, [response], crossChainProofs);

      //check statuses of two different multiRequests pointing to the same requests after response
      isMultiRequestVerified = await verifier.isMultiRequestVerified(
        multiRequest.multiRequestId,
        signerAddress,
      );
      expect(isMultiRequestVerified).to.be.true;

      isMultiRequest2Verified = await verifier.isMultiRequestVerified(
        multiRequest2.multiRequestId,
        signerAddress,
      );
      expect(isMultiRequest2Verified).to.be.true;
    });

    it("getMultiRequestStatus: multi request should exist", async function () {
      const nonExistingMultiRequestId = 5;
      await expect(verifier.getMultiRequestStatus(nonExistingMultiRequestId, signerAddress))
        .to.be.revertedWithCustomError(verifier, "MultiRequestIdNotFound")
        .withArgs(nonExistingMultiRequestId);
      await expect(verifier.getMultiRequestStatus(multiRequest.multiRequestId, signerAddress)).not
        .to.be.rejected;
    });

    it.skip("getMultiRequestStatus: linkID should be equal to all requests in a group, otherwise multiRequest pointing to it returns false", async function () {
      // TODO linkID should be equal to all requests in a group, otherwise multiRequest pointing to it returns false
    });
  });
});
