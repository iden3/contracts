import { beforeEach } from "mocha";
import { expect } from "chai";
import { chainIdInfoMap } from "../../helpers/constants";
import { network } from "hardhat";
import { getChainId } from "../../helpers/helperUtils";
import {
  Groth16VerifierStubModule,
  RequestValidatorStubModule,
  ValidatorWhitelistTestWrapperModule,
} from "../../ignition/modules/deployEverythingBasicStrategy/testHelpers";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("ValidatorWhitelist tests", function () {
  let verifier, validator: any;
  let signer1, signer2: any;
  let request, paramsFromValidator: any;

  async function deployContractsFixture() {
    [signer1, signer2] = await ethers.getSigners();

    const chainId = await getChainId();
    const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;

    const parameters: any = {
      CrossChainProofValidatorModule: {
        domainName: "StateInfo",
        signatureVersion: "1",
        oracleSigningAddress: oracleSigningAddress,
      },
      StateProxyModule: {
        defaultIdType: "0x0112",
      },
    };

    const { state, validatorWhitelistTestWrapper: verifier } = await ignition.deploy(
      ValidatorWhitelistTestWrapperModule,
      {
        parameters: parameters,
      },
    );

    const groth16VerifierStub = (await ignition.deploy(Groth16VerifierStubModule))
      .groth16VerifierStub;
    await state.setVerifier(await groth16VerifierStub.getAddress());

    const validator = (await ignition.deploy(RequestValidatorStubModule)).requestValidatorStub;

    return { verifier, validator, signer1, signer2 };
  }

  beforeEach(async function () {
    ({ verifier, validator, signer1, signer2 } =
      await networkHelpers.loadFixture(deployContractsFixture));

    request = {
      requestId: 1,
      metadata: "0x",
      validator: await validator.getAddress(),
      creator: await signer1.getAddress(),
      params: "0x",
    };

    paramsFromValidator = [
      { name: "groupID", value: 0 },
      { name: "verifierID", value: 0 },
      { name: "nullifierSessionID", value: 0 },
    ];
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
    await validator.stub_setInput("userID", 1);
    await verifier.setRequests([request]);

    await expect(verifier.testModifier(await validator.getAddress())).not.to.be.revert(ethers);
    await expect(verifier.getRequestIfCanBeVerified(request.requestId)).not.to.be.revert(ethers);

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
