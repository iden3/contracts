import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("ValidatorWhitelist tests", function () {
  let verifier, validator: any;
  let signer1, signer2: any;
  let request, paramsFromValidator: any;

  async function deployContractsFixture() {
    [signer1, signer2] = await ethers.getSigners();

    const deployHelper = await DeployHelper.initialize(null, true);
    const verifier = await ethers.deployContract("ValidatorWhitelistTestWrapper", []);

    const { state } = await deployHelper.deployStateWithLibraries([], "Groth16VerifierStub");
    await verifier.initialize(await state.getAddress());

    const validator = await ethers.deployContract("RequestValidatorStub");
    return { verifier, validator, signer1, signer2 };
  }

  beforeEach(async function () {
    ({ verifier, validator, signer1, signer2 } = await deployContractsFixture());

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

  it("whitelist/remove Validators and modifier onlyWhitelistedValidator", async function () {
    let isWhitelistedValidator = await verifier.isWhitelistedValidator(
      await validator.getAddress(),
    );
    expect(isWhitelistedValidator).to.be.false;

    await expect(verifier.testModifier(await validator.getAddress())).to.be.revertedWithCustomError(
      verifier,
      "ValidatorIsNotWhitelisted",
    );

    await verifier.addValidatorToWhitelist(await validator.getAddress());

    await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
    await verifier.setRequests([request]);

    await expect(verifier.testModifier(await validator.getAddress())).not.to.be.reverted;
    await expect(verifier.getRequestIfCanBeVerified(request.requestId)).not.to.be.reverted;

    isWhitelistedValidator = await verifier.isWhitelistedValidator(await validator.getAddress());
    expect(isWhitelistedValidator).to.be.true;

    await verifier.removeValidatorFromWhitelist(await validator.getAddress());

    await expect(verifier.testModifier(await validator.getAddress()))
      .to.be.revertedWithCustomError(verifier, "ValidatorIsNotWhitelisted")
      .withArgs(await validator.getAddress());
    await expect(verifier.getRequestIfCanBeVerified(request.requestId))
      .to.be.revertedWithCustomError(verifier, "ValidatorIsNotWhitelisted")
      .withArgs(await validator.getAddress());

    isWhitelistedValidator = await verifier.isWhitelistedValidator(await validator.getAddress());
    expect(isWhitelistedValidator).to.be.false;
  });
});
