import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";
import {
  calculateGroupID,
  calculateMultiRequestId,
  calculateRequestID,
} from "../utils/id-calculation-utils";

describe("Verifier tests", function () {
  let sender: any;
  let verifier, validator1, validator2: any;
  let request, paramsFromValidator, authMethod: any;
  let multiRequest: any;
  let signer: any;
  let signerAddress: string;
  let verifierId: any;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    const deployHelper = await DeployHelper.initialize(null, true);
    const verifier = await ethers.deployContract("VerifierTestWrapper", []);

    const { state } = await deployHelper.deployStateWithLibraries([], "Groth16VerifierStub");
    await verifier.initialize(await state.getAddress());

    const authValidatorStub = await ethers.deployContract("AuthValidatorStub");
    await authValidatorStub.stub_setVerifyResults(1);

    authMethod = {
      authMethod: "stubAuth",
      validator: await authValidatorStub.getAddress(),
      params: "0x",
    };

    await verifier.setAuthMethod(authMethod);

    const validator1 = await ethers.deployContract("RequestValidatorStub");
    const validator2 = await ethers.deployContract("RequestValidatorStub");
    return { verifier, validator1, validator2 };
  }

  describe("Single request tests", function () {
    beforeEach(async function () {
      [sender] = await ethers.getSigners();
      ({ verifier, validator1, validator2 } = await deployContractsFixture());

      verifierId = await verifier.getVerifierID();

      request = {
        requestId: 1,
        metadata: "0x",
        validator: await validator1.getAddress(),
        creator: await sender.getAddress(),
        params: "0x",
      };

      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];

      multiRequest = {
        multiRequestId: calculateMultiRequestId([request.requestId], [], signerAddress),
        requestIds: [request.requestId],
        groupIds: [],
        metadata: "0x",
      };
    });

    it("setRequests: should not exist when creating", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      let requestIdExists = await verifier.requestIdExists(request.requestId);
      expect(requestIdExists).to.be.false;
      let requestsCount = await verifier.getRequestsCount();
      expect(requestsCount).to.be.equal(0);

      await expect(verifier.setRequests([request])).not.to.be.rejected;
      await expect(verifier.setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "RequestIdAlreadyExists")
        .withArgs(request.requestId);

      requestIdExists = await verifier.requestIdExists(request.requestId);
      expect(requestIdExists).to.be.true;
      requestsCount = await verifier.getRequestsCount();
      expect(requestsCount).to.be.equal(1);
    });

    it("setRequests: should revert with MissingUserIDInRequest", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);

      await expect(verifier.setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "MissingUserIDInRequest")
        .withArgs(request.requestId);
    });

    it("setRequests: nullifierSessionID may be not unique if EQUAL to 0", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      await verifier.setRequests([request]);
      request.requestId = 2;
      await verifier.setRequests([request]);
    });

    it("setRequests: nullifierSessionID must be unique if NOT EQUAL to 0", async function () {
      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 1 },
      ];
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      await verifier.setRequests([request]);
      request.requestId = 2;
      await expect(verifier.setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "NullifierSessionIDAlreadyExists")
        .withArgs(1);
    });

    it("Check InvalidRequestOwner", async () => {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      const requestOwner = (await ethers.getSigners())[2];

      await expect(verifier.connect(requestOwner).setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "InvalidRequestOwner")
        .withArgs(request.creator, await requestOwner.getAddress());

      // Request owner the same as the sender
      const request3 = {
        ...request,
        requestId: request.requestId + 1,
        creator: await requestOwner.getAddress(),
      };
      await expect(verifier.connect(requestOwner).setRequests([request3])).not.to.be.reverted;
    });

    it("setRequests: requestId should be valid", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      request.requestId = BigInt(
        "0x0002000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
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

      const expectedRequestId = calculateRequestID(request.params, sender.address);
      request.requestId = BigInt(
        "0x0001000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      ); // requestId idType is valid but calculation from hash params is not valid
      await expect(verifier.setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotValid")
        .withArgs(expectedRequestId, request.requestId);

      // requestId is valid;
      request.requestId = expectedRequestId;
      await expect(verifier.setRequests([request])).not.to.be.rejected;
    });

    it("setRequests: a group should be formed by the groupID encoded in requests params", async function () {
      const requestId2 = 2;
      const groupID = calculateGroupID([request.requestId, BigInt(requestId2)]);

      const request1 = { ...request, groupID };
      const request2 = { ...request, requestId: requestId2, groupID };
      paramsFromValidator = [
        { name: "groupID", value: groupID },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
      await validator1.stub_setRequestParams([request1.params], [paramsFromValidator]);
      await validator1.stub_setRequestParams([request2.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      let groupExists = await verifier.groupIdExists(groupID);
      expect(groupExists).to.be.false;
      let groupsCount = await verifier.getGroupsCount();
      expect(groupsCount).to.be.equal(0);

      await verifier.setRequests([request1, request2]);

      groupExists = await verifier.groupIdExists(groupID);
      expect(groupExists).to.be.true;
      groupsCount = await verifier.getGroupsCount();
      expect(groupsCount).to.be.equal(1);

      const groupedRequests = await verifier.getGroupedRequests(groupID);
      expect(groupedRequests.length).to.be.equal(2);
      expect(groupedRequests[0].requestId).to.be.equal(request1.requestId);
      expect(groupedRequests[1].requestId).to.be.equal(request2.requestId);
    });

    it("setRequests: a group should not exist previously", async function () {
      const requestId2 = 2;
      const groupID = calculateGroupID([BigInt(request.requestId), BigInt(requestId2)]);

      const request1 = { ...request, groupID };
      const request2 = { ...request, requestId: requestId2, groupID };

      paramsFromValidator = [
        { name: "groupID", value: groupID },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
      await validator1.stub_setRequestParams([request1.params], [paramsFromValidator]);
      await validator1.stub_setRequestParams([request2.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      await verifier.setRequests([request1, request2]);

      await expect(verifier.setRequests([request1, request2]))
        .to.be.revertedWithCustomError(verifier, "GroupIdAlreadyExists")
        .withArgs(groupID);
    });

    it("getRequest: requestId should exist", async function () {
      await expect(verifier.getRequest(request.requestId))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(request.requestId);

      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: verifierId },
        { name: "nullifierSessionID", value: 0 },
      ];

      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);
      await verifier.setRequests([request]);

      const requestObject = await verifier.getRequest(request.requestId);

      expect(requestObject.requestId).to.be.equal(request.requestId);
      expect(requestObject.metadata).to.be.equal(request.metadata);
      expect(requestObject.validator).to.be.equal(request.validator);
      expect(requestObject.params).to.be.equal(request.params);
      expect(requestObject.creator).to.be.equal(await signer.getAddress());
    });

    it("getRequestProofStatus: requestId should exist", async function () {
      const nonExistingRequestId = 2;

      await expect(verifier.getRequestProofStatus(signerAddress, nonExistingRequestId))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(nonExistingRequestId);
    });

    it("getAuthMethod: authMethod should exist", async function () {
      const authMethod2 = { ...authMethod, authMethod: "stubAuth2" };

      await expect(verifier.getAuthMethod(authMethod2.authMethod))
        .to.be.revertedWithCustomError(verifier, "AuthMethodNotFound")
        .withArgs(authMethod2.authMethod);

      await expect(verifier.setAuthMethod(authMethod))
        .to.be.revertedWithCustomError(verifier, "AuthMethodAlreadyExists")
        .withArgs(authMethod.authMethod);

      await expect(verifier.setAuthMethod(authMethod2)).not.to.be.reverted;

      const authMethodObject = await verifier.getAuthMethod(authMethod.authMethod);
      expect(authMethodObject.validator).to.be.equal(authMethod2.validator);
      expect(authMethodObject.params).to.be.equal(authMethod2.params);
    });

    it("enableAuthMethod/disableAuthMethod", async function () {
      let authMethodObject = await verifier.getAuthMethod(authMethod.authMethod);
      expect(authMethodObject.isActive).to.be.true;

      await verifier.disableAuthMethod(authMethod.authMethod);

      authMethodObject = await verifier.getAuthMethod(authMethod.authMethod);
      expect(authMethodObject.isActive).to.be.false;

      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);
      await verifier.setRequests([request]);

      const authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      await expect(verifier.submitResponse(authResponse, [response], crossChainProofs))
        .to.be.revertedWithCustomError(verifier, "AuthMethodIsNotActive")
        .withArgs(authMethod.authMethod);

      await verifier.enableAuthMethod(authMethod.authMethod);

      authMethodObject = await verifier.getAuthMethod(authMethod.authMethod);
      expect(authMethodObject.isActive).to.be.true;

      await expect(verifier.submitResponse(authResponse, [response], crossChainProofs)).not.to.be
        .reverted;
    });

    it("submitResponse: not repeated responseFields from validator", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);
      await verifier.setRequests([request]);
      await validator1.stub_setVerifyResults([
        {
          name: "someFieldName1",
          value: 1,
          rawValue: "0x",
        },
        {
          name: "someFieldName2",
          value: 2,
          rawValue: "0x",
        },
      ]);

      const authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      let isRequestProofVerified = await verifier.isRequestProofVerified(sender, request.requestId);
      expect(isRequestProofVerified).to.be.false;

      await verifier.submitResponse(authResponse, [response], crossChainProofs);

      isRequestProofVerified = await verifier.isRequestProofVerified(sender, request.requestId);
      expect(isRequestProofVerified).to.be.true;

      const responseField1 = await verifier.getResponseFieldValue(
        request.requestId,
        sender,
        "someFieldName1",
      );
      expect(responseField1).to.be.equal(1);
      const responseField2 = await verifier.getResponseFieldValue(
        request.requestId,
        sender,
        "someFieldName2",
      );
      expect(responseField2).to.be.equal(2);

      const responseFields = await verifier.getResponseFields(request.requestId, sender);
      expect(responseFields.length).to.be.equal(2);
      expect(responseFields[0].name).to.be.equal("someFieldName1");
      expect(responseFields[0].value).to.be.equal(1);
      expect(responseFields[1].name).to.be.equal("someFieldName2");
      expect(responseFields[1].value).to.be.equal(2);
    });

    it("submitResponse: should throw if repeated responseFields from validator", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);
      await verifier.setRequests([request]);
      await validator1.stub_setVerifyResults([
        {
          name: "someFieldName1",
          value: 1,
          rawValue: "0x",
        },
        {
          name: "someFieldName1",
          value: 1,
          rawValue: "0x",
        },
      ]);

      const authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      const response = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";
      await expect(verifier.submitResponse(authResponse, [response], crossChainProofs))
        .to.revertedWithCustomError(verifier, "ResponseFieldAlreadyExists")
        .withArgs("someFieldName1");
    });

    it("submitResponse: userID in response fields should match auth userID", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);
      await verifier.setRequests([request]);

      let userID = 1; // we assume that userID is hardcoded to 1 in the auth stub contract
      await validator1.stub_setVerifyResults([
        {
          name: "userID",
          value: userID,
          rawValue: "0x",
        },
      ]);

      const authResponse = {
        authMethod: authMethod.authMethod,
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
      await validator1.stub_setVerifyResults([
        {
          name: "userID",
          value: userID,
          rawValue: "0x",
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
      ({ verifier, validator1, validator2 } = await deployContractsFixture());

      request = {
        requestId: 1,
        metadata: "0x",
        validator: await validator1.getAddress(),
        creator: await sender.getAddress(),
        params: "0x",
      };

      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];

      multiRequest = {
        multiRequestId: calculateMultiRequestId([request.requestId], [], signerAddress),
        requestIds: [request.requestId],
        groupIds: [],
        metadata: "0x",
      };
    });

    it("setMultiRequest: should not exist when creating", async function () {
      await validator1.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);
      await verifier.setRequests([request]);

      let multiRequestIdExists = await verifier.multiRequestIdExists(multiRequest.multiRequestId);
      expect(multiRequestIdExists).to.be.false;
      await expect(verifier.setMultiRequest(multiRequest)).not.to.be.rejected;
      await expect(verifier.setMultiRequest(multiRequest))
        .revertedWithCustomError(verifier, "MultiRequestIdAlreadyExists")
        .withArgs(multiRequest.multiRequestId);
      multiRequestIdExists = await verifier.multiRequestIdExists(multiRequest.multiRequestId);
      expect(multiRequestIdExists).to.be.true;
    });

    it("setMultiRequest: should only create multi request with correct id", async function () {
      await expect(verifier.setMultiRequest({ ...multiRequest, multiRequestId: 1 }))
        .to.be.revertedWithCustomError(verifier, "MultiRequestIdNotValid")
        .withArgs(multiRequest.multiRequestId, 1);
    });

    it("setMultiRequest: requestIds and groupIds should exist", async function () {
      const multiRequest2 = {
        multiRequestId: calculateMultiRequestId([2n], [], signerAddress),
        requestIds: [2],
        groupIds: [],
        metadata: "0x",
      };

      await expect(verifier.setMultiRequest(multiRequest2))
        .revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(multiRequest2.requestIds[0]);

      const multiRequest3 = {
        multiRequestId: calculateMultiRequestId([], [2n], signerAddress),
        requestIds: [],
        groupIds: [2],
        metadata: "0x",
      };

      await expect(verifier.setMultiRequest(multiRequest3))
        .revertedWithCustomError(verifier, "GroupIdNotFound")
        .withArgs(multiRequest3.groupIds[0]);
    });

    it("getMultiRequest: multiRequestId should exist", async function () {
      const nonExistingMultiRequestId = 5;
      await expect(verifier.getMultiRequest(nonExistingMultiRequestId))
        .to.be.revertedWithCustomError(verifier, "MultiRequestIdNotFound")
        .withArgs(nonExistingMultiRequestId);
      const multiRequestObject = await verifier.getMultiRequest(multiRequest.multiRequestId);
      expect(multiRequestObject.multiRequestId).to.be.equal(multiRequest.multiRequestId);
      expect(multiRequestObject.metadata).to.be.equal(multiRequest.metadata);
      expect(multiRequestObject.requestIds.length).to.be.equal(multiRequest.requestIds.length);
      expect(multiRequestObject.groupIds.length).to.be.equal(multiRequest.groupIds.length);
    });

    it("setMultiRequest: check statuses of two different multiRequests pointing to the same requests", async function () {
      const signer2 = (await ethers.getSigners())[1];
      const multiRequest2 = {
        ...multiRequest,
        multiRequestId: calculateMultiRequestId(
          multiRequest.requestIds,
          multiRequest.groupIds,
          signer2.address,
        ),
      };
      await verifier.connect(signer2).setMultiRequest(multiRequest2);

      let areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
        multiRequest.multiRequestId,
        signerAddress,
      );
      expect(areMultiRequestProofsVerified).to.be.false;

      let isMultiRequest2Verified = await verifier.areMultiRequestProofsVerified(
        multiRequest2.multiRequestId,
        signerAddress,
      );
      expect(isMultiRequest2Verified).to.be.false;

      const userID = 1; // we assume that userID is hardcoded to 1 in the auth stub contract
      await validator1.stub_setVerifyResults([
        {
          name: "userID",
          value: userID,
          rawValue: "0x",
        },
      ]);

      const authResponse = {
        authMethod: authMethod.authMethod,
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
      areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
        multiRequest.multiRequestId,
        signerAddress,
      );
      expect(areMultiRequestProofsVerified).to.be.true;

      isMultiRequest2Verified = await verifier.areMultiRequestProofsVerified(
        multiRequest2.multiRequestId,
        signerAddress,
      );
      expect(isMultiRequest2Verified).to.be.true;
    });

    it("getMultiRequestProofsStatus: multi request should exist", async function () {
      const nonExistingMultiRequestId = 5;
      await expect(verifier.getMultiRequestProofsStatus(nonExistingMultiRequestId, signerAddress))
        .to.be.revertedWithCustomError(verifier, "MultiRequestIdNotFound")
        .withArgs(nonExistingMultiRequestId);
      await expect(verifier.getMultiRequestProofsStatus(multiRequest.multiRequestId, signerAddress))
        .not.to.be.rejected;
    });

    it("getMultiRequestProofsStatus: linkID should be equal to all requests in a group, otherwise multiRequest pointing to it returns false", async function () {
      const requestId1 = 5;
      const requestId2 = 6;
      const groupID = calculateGroupID([BigInt(requestId1), BigInt(requestId2)]);
      const groupRequest1 = { ...request, requestId: requestId1, groupID };
      const groupRequest2 = {
        ...request,
        validator: await validator2.getAddress(),
        requestId: requestId2,
        groupID,
      };
      const paramsFromValidator1 = [
        { name: "groupID", value: groupID },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
      const paramsFromValidator2 = [
        { name: "groupID", value: groupID },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
      await validator1.stub_setRequestParams([groupRequest1.params], [paramsFromValidator1]);
      await validator2.stub_setRequestParams([groupRequest2.params], [paramsFromValidator2]);
      await validator1.stub_setInput("userID", 1);
      await validator2.stub_setInput("userID", 1);

      await verifier.setRequests([groupRequest1, groupRequest2]);

      const multiRequest3 = {
        multiRequestId: calculateMultiRequestId([], [groupID], signerAddress),
        requestIds: [],
        groupIds: [groupID],
        metadata: "0x",
      };
      await verifier.setMultiRequest(multiRequest3);

      const userID = 1;
      await validator1.stub_setVerifyResults([
        { name: "userID", value: userID, rawValue: "0x" },
        { name: "issuerID", value: 2, rawValue: "0x" },
        { name: "linkID", value: 3, rawValue: "0x" },
      ]);
      await validator2.stub_setVerifyResults([
        { name: "userID", value: userID, rawValue: "0x" },
        { name: "issuerID", value: 2, rawValue: "0x" },
        { name: "linkID", value: 4, rawValue: "0x" },
      ]);

      const authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      const response1 = {
        requestId: groupRequest1.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const response2 = {
        requestId: groupRequest2.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      await verifier.submitResponse(authResponse, [response1, response2], crossChainProofs);
      await expect(
        verifier.getMultiRequestProofsStatus(multiRequest3.multiRequestId, signerAddress),
      ).to.be.revertedWithCustomError(verifier, "LinkIDNotTheSameForGroupedRequests");

      const areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
        multiRequest3.multiRequestId,
        signerAddress,
      );
      expect(areMultiRequestProofsVerified).to.be.false;
    });

    it("getMultiRequestProofsStatus: all request with same linkID in a group already verified returns true", async function () {
      const requestId1 = 10;
      const requestId2 = 11;
      const groupID = calculateGroupID([BigInt(requestId1), BigInt(requestId2)]);
      const request1 = { ...request, requestId: requestId1, groupID: groupID };
      const request2 = {
        ...request,
        requestId: requestId2,
        groupID: groupID,
      };
      paramsFromValidator = [
        { name: "groupID", value: groupID },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
      await validator1.stub_setRequestParams([request1.params], [paramsFromValidator]);
      await validator1.stub_setRequestParams([request2.params], [paramsFromValidator]);
      await validator1.stub_setInput("userID", 1);

      await verifier.setRequests([request1, request2]);

      const multiRequest4 = {
        multiRequestId: calculateMultiRequestId([], [groupID], signerAddress),
        requestIds: [],
        groupIds: [groupID],
        metadata: "0x",
      };
      await verifier.setMultiRequest(multiRequest4);

      const userID = 1;
      await validator1.stub_setVerifyResults([
        { name: "userID", value: userID, rawValue: "0x" },
        { name: "issuerID", value: 2, rawValue: "0x" },
        { name: "linkID", value: 3, rawValue: "0x" },
      ]);

      const authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      const response1 = {
        requestId: request1.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const response2 = {
        requestId: request2.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      // partial responses of the multiRequest group
      await verifier.submitResponse(authResponse, [response1], crossChainProofs);

      await expect(
        verifier.getMultiRequestProofsStatus(multiRequest4.multiRequestId, signerAddress),
      ).to.be.revertedWithCustomError(verifier, "LinkIDNotTheSameForGroupedRequests");

      let areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
        multiRequest4.multiRequestId,
        signerAddress,
      );
      expect(areMultiRequestProofsVerified).to.be.false;

      // all responses of the multiRequest group completed
      await verifier.submitResponse(authResponse, [response2], crossChainProofs);

      await expect(
        verifier.getMultiRequestProofsStatus(multiRequest4.multiRequestId, signerAddress),
      ).not.to.be.rejected;

      areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
        multiRequest4.multiRequestId,
        signerAddress,
      );
      expect(areMultiRequestProofsVerified).to.be.true;
    });
  });
});
