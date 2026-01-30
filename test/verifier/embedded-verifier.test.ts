import { beforeEach } from "mocha";
import { expect } from "chai";
import { chainIdInfoMap } from "../../helpers/constants";
import { network } from "hardhat";
import { getChainId } from "../../helpers/helperUtils";
import {
  AuthValidatorStubModule,
  EmbeddedVerifierWrapperModule,
  Groth16VerifierStubModule,
  RequestValidatorStubModule,
} from "../../ignition/modules/deployEverythingBasicStrategy/testHelpers";

const { ethers, ignition, networkHelpers } = await network.connect();

describe("EmbeddedVerifier tests", function () {
  let verifier, state, validator, signer: any;
  let request, paramsFromValidator, authResponse, response, crossChainProofs: any;

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

    const { state, embeddedVerifierWrapper: verifier } = await ignition.deploy(
      EmbeddedVerifierWrapperModule,
      {
        parameters: parameters,
      },
    );

    const groth16VerifierStub = (await ignition.deploy(Groth16VerifierStubModule))
      .groth16VerifierStub;
    await state.setVerifier(await groth16VerifierStub.getAddress());

    const validator = (await ignition.deploy(RequestValidatorStubModule)).requestValidatorStub;

    const authValidator = (await ignition.deploy(AuthValidatorStubModule)).authValidatorStub;
    await authValidator.stub_setVerifyResults(1);

    const authMethod = {
      authMethod: "stubAuth",
      validator: await authValidator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthMethod(authMethod);

    return { state, verifier, validator };
  }

  beforeEach(async function () {
    ({ state, verifier, validator } = await networkHelpers.loadFixture(deployContractsFixture));

    request = {
      requestId: 0,
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

    authResponse = {
      authMethod: "stubAuth",
      proof: "0x",
      metadata: "0x",
    };
    response = {
      requestId: 0,
      proof: "0x",
      metadata: "0x",
    };

    crossChainProofs = "0x";
  });

  it("Test get state address", async () => {
    let stateAddr = await verifier.getStateAddress();
    expect(stateAddr).to.be.equal(await state.getAddress());

    await verifier.setState(await signer.getAddress());

    stateAddr = await verifier.getStateAddress();
    expect(stateAddr).to.be.equal(await signer.getAddress());

    await verifier.setState(await state.getAddress());
  });

  it("beforeProofSubmit/afterProofSubmit when submitting response", async function () {
    await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
    await validator.stub_setInput("userID", 1);

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
