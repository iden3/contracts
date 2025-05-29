import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("RequestOwnership tests", function () {
  let verifier, validator: any;
  let request, paramsFromValidator: any;
  let signer1, signer2: any;

  async function deployContractsFixture() {
    [signer1, signer2] = await ethers.getSigners();

    const deployHelper = await DeployHelper.initialize(null, true);
    const verifier = await ethers.deployContract("RequestOwnershipTestWrapper", []);

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
