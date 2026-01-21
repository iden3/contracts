import { beforeEach } from "mocha";
import { expect } from "chai";
import { chainIdInfoMap } from "../../helpers/constants";
import { network } from "hardhat";
import { getChainId } from "../../helpers/helperUtils";
import {
  Groth16VerifierStubModule,
  RequestOwnershipTestWrapperModule,
  RequestValidatorStubModule,
} from "../../ignition/modules/deployEverythingBasicStrategy/testHelpers";

const { ethers, ignition } = await network.connect();

describe("RequestOwnership tests", function () {
  let verifier, validator: any;
  let request, paramsFromValidator: any;
  let signer1, signer2: any;

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

    const { state, requestOwnershipTestWrapper: verifier } = await ignition.deploy(
      RequestOwnershipTestWrapperModule,
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
    ({ verifier, validator, signer1, signer2 } = await deployContractsFixture());

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

  it("setRequestOwner: change request ownership", async function () {
    await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
    await validator.stub_setInput("userID", 1);
    await verifier.setRequests([request]);

    let owner = await verifier.getRequestOwner(request.requestId);
    expect(owner).to.be.equal(await signer1.getAddress());

    await verifier.setRequestOwner(request.requestId, await signer2.getAddress());

    owner = await verifier.getRequestOwner(request.requestId);
    expect(owner).to.be.equal(await signer2.getAddress());
  });
});
