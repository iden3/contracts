import { beforeEach } from "mocha";
import { expect } from "chai";
import { chainIdInfoMap } from "../../helpers/constants";
import { network } from "hardhat";
import { getChainId } from "../../helpers/helperUtils";
import {
  Groth16VerifierStubModule,
  RequestDisableableTestWrapperModule,
  RequestValidatorStubModule,
} from "../../ignition/modules/deployEverythingBasicStrategy/testHelpers";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("RequestDisableable tests", function () {
  let verifier, validator: any;
  let request, paramsFromValidator: any;
  let signer: any;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();

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

    const { state, requestDisableableTestWrapper: verifier } = await ignition.deploy(
      RequestDisableableTestWrapperModule,
      {
        parameters: parameters,
      },
    );

    const groth16VerifierStub = (await ignition.deploy(Groth16VerifierStubModule))
      .groth16VerifierStub;
    await state.setVerifier(await groth16VerifierStub.getAddress());

    const validator = (await ignition.deploy(RequestValidatorStubModule)).requestValidatorStub;

    return { verifier, validator };
  }

  beforeEach(async function () {
    ({ verifier, validator } = await networkHelpers.loadFixture(deployContractsFixture));

    request = {
      requestId: 1,
      metadata: "0x",
      validator: await validator.getAddress(),
      creator: signer.address,
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
    await validator.stub_setInput("userID", 1);

    await verifier.setRequests([request]);

    let isRequestEnabled = await verifier.isRequestEnabled(request.requestId);
    expect(isRequestEnabled).to.be.true;

    await expect(verifier.testModifier(request.requestId)).not.to.be.revert(ethers);
    await expect(verifier.getRequestIfCanBeVerified(request.requestId)).not.to.be.revert(ethers);

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

    await expect(verifier.testModifier(request.requestId)).not.to.be.revert(ethers);
  });
});
