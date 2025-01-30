import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("RequestDisableable tests", function () {
  let verifier, validator: any;
  let request, paramsFromValidator: any;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize(null, true);
    const verifier = await ethers.deployContract("RequestDisableableTestWrapper", []);

    const { state } = await deployHelper.deployStateWithLibraries([], "Groth16VerifierStub");
    await verifier.initialize(await state.getAddress());

    const validator = await ethers.deployContract("RequestValidatorStub");
    return { verifier, validator };
  }

  beforeEach(async function () {
    ({ verifier, validator } = await deployContractsFixture());

    request = {
      requestId: 1,
      metadata: "0x",
      validator: await validator.getAddress(),
      params: "0x",
    };

    paramsFromValidator = [
      { name: "groupID", value: 0 },
      { name: "verifierID", value: 0 },
      { name: "nullifierSessionID", value: 0 },
    ];
  });

  it("disable/enable request and onlyEnabledRequest modifier", async function () {
    await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

    await verifier.setRequests([request]);

    let isRequestEnabled = await verifier.isRequestEnabled(request.requestId);
    expect(isRequestEnabled).to.be.true;

    await expect(verifier.testModifier(request.requestId)).not.to.be.reverted;
    await expect(verifier.getRequestIfCanBeVerified(request.requestId)).not.to.be.reverted;

    await verifier.disableRequest(request.requestId);

    isRequestEnabled = await verifier.isRequestEnabled(request.requestId);
    expect(isRequestEnabled).to.be.false;

    await expect(verifier.testModifier(request.requestId))
      .to.be.revertedWithCustomError(verifier, "RequestIsDisabled")
      .withArgs(request.requestId);

    await expect(verifier.getRequestIfCanBeVerified(request.requestId))
      .to.be.revertedWithCustomError(verifier, "RequestIsDisabled")
      .withArgs(request.requestId);

    await verifier.enableRequest(request.requestId);

    isRequestEnabled = await verifier.isRequestEnabled(request.requestId);
    expect(isRequestEnabled).to.be.true;

    await expect(verifier.testModifier(request.requestId)).not.to.be.reverted;
  });
});
