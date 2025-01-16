import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("Verifer tests", function () {
  let sender: any;
  let verifier, validator: any;
  let request, paramsFromValidator: any;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize(null, true);
    const veriferLib = await ethers.deployContract("VerifierLib");
    const verifier = await ethers.deployContract("VerifierTestWrapper", [], {
      libraries: { VerifierLib: await veriferLib.getAddress() },
    });

    const { state } = await deployHelper.deployStateWithLibraries([], "Groth16VerifierStub");
    await verifier.initialize(await state.getAddress());

    const authValidatorStub = await ethers.deployContract("AuthValidatorStub");
    const authType = {
      authType: "stubAuth",
      validator: await authValidatorStub.getAddress(),
      params: "0x",
    };
    await verifier.setAuthType(authType);

    const validator = await ethers.deployContract("RequestValidatorStub");
    return { verifier, validator };
  }

  describe("Single request tests", function () {
    beforeEach(async function () {
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

    it("setRequests: requestId should be valid and not using reserved bytes", async function () {
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

      request.requestId = BigInt(2 ** 256) - BigInt(1);

      await expect(verifier.setRequests([request])).to.be.revertedWithCustomError(
        verifier,
        "RequestIdNotValid",
      );

      request.requestId = BigInt(2 ** 248) + BigInt(2 ** 247);
      await expect(verifier.setRequests([request])).to.be.revertedWithCustomError(
        verifier,
        "RequestIdUsesReservedBytes",
      );
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

    it.skip("submitResponse: should throw if repeated responseFields from validator", async function () {
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
        .to.revertedWithCustomError(verifier, "ResponseFieldAlreadyExists")
        .withArgs("someFieldName1");
    });

    it.skip("submitResponse: userID in response fields should match auth userID", async function () {
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

    it("submitResponse: a group should be formed by the groupID encoded in requests params", async function () {
      // TODO: implement
    });
  });

  describe("Multi request tests", function () {
    it("setMultiRequest", async function () {
      // TODO check statuses of two different multiRequests pointing to the same requests
    });

    it("getStatus", async function () {
      // TODO linkID should be equal to all requests in a group, otherwise multiRequest pointing to it returns false
    });
  });
});
