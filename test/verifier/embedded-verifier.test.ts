import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("EmbeddedVerifier tests", function () {
  let verifier, validator, signer: any;
  let request, paramsFromValidator, authResponse, response, crossChainProofs: any;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    const deployHelper = await DeployHelper.initialize(null, true);
    const verifierLib = await ethers.deployContract("VerifierLib");
    const verifier = await ethers.deployContract("EmbeddedVerifierWrapper", [], {
      libraries: { VerifierLib: await verifierLib.getAddress() },
    });

    const { state } = await deployHelper.deployStateWithLibraries([], "Groth16VerifierStub");
    await verifier.initialize(await signer.getAddress(), await state.getAddress());

    const validator = await ethers.deployContract("RequestValidatorStub");

    const authValidator = await deployHelper.deployValidatorStub("AuthValidatorStub");
    await authValidator.stub_setVerifyResults(1);

    const authType = {
      authType: "stubAuth",
      validator: await authValidator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthType(authType);

    return { verifier, validator };
  }

  beforeEach(async function () {
    ({ verifier, validator } = await deployContractsFixture());

    request = {
      requestId: 0,
      metadata: "0x",
      validator: await validator.getAddress(),
      params: "0x",
    };

    paramsFromValidator = {
      groupID: 0,
      verifierID: 0,
      nullifierSessionID: 0,
    };

    authResponse = {
      authType: "stubAuth",
      proof: "0x",
    };
    response = {
      requestId: 0,
      proof: "0x",
      metadata: "0x",
    };

    crossChainProofs = "0x";
  });

  it("beforeProofSubmit/afterProofSubmit when submitting response", async function () {
    await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

    await verifier.setRequests([request]);

    await expect(verifier.submitResponse(authResponse, [response], crossChainProofs)).to.emit(
      verifier,
      "BeforeProofSubmit",
    );

    let filter = verifier.filters.BeforeProofSubmit;
    let events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("BeforeProofSubmit");
    expect(events[0].args.authResponse).to.deep.equal(Object.values(authResponse));
    expect(events[0].args.responses).to.deep.equal([Object.values(response)]);

    filter = verifier.filters.AfterProofSubmit;
    events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("AfterProofSubmit");
    expect(events[0].args.authResponse).to.deep.equal(Object.values(authResponse));
    expect(events[0].args.responses).to.deep.equal([Object.values(response)]);
  });
});
