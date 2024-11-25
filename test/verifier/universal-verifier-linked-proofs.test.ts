import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { expect } from "chai";
import testData from "./linked-proofs-data.json";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { TEN_YEARS } from "../../helpers/constants";

describe("Universal Verifier Linked proofs", function () {
  let verifier: any, v3: any, state: any;
  let signer, signer2;
  let signerAddress: string;
  let deployHelper: DeployHelper;

  async function deployContractsFixture() {
    [signer, signer2] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    ({ state } = await deployHelper.deployStateWithLibraries(["0x0112"]));

    const verifierLib = await deployHelper.deployVerifierLib();

    verifier = await deployHelper.deployUniversalVerifier(
      signer,
      await state.getAddress(),
      await verifierLib.getAddress(),
    );

    const contracts = await deployHelper.deployValidatorContractsWithVerifiers(
      "v3",
      await state.getAddress(),
    );
    v3 = contracts.validator;
    await verifier.addValidatorToWhitelist(await v3.getAddress());
    await verifier.connect();

    await publishState(state, testData.state as unknown as { [key: string]: string });
    await v3.setProofExpirationTimeout(TEN_YEARS);
    for (let i = 0; i < testData.queryData.zkpRequests.length; i++) {
      await verifier.setZKPRequest(100 + i, {
        metadata: "linkedProofN" + i,
        validator: await v3.getAddress(),
        data: packV3ValidatorParams(testData.queryData.zkpRequests[i].request),
      });
    }

    for (let i = 0; i < testData.queryData.zkpResponses.length; i++) {
      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(testData.queryData.zkpResponses[i]);
      await verifier.submitZKPResponse(100 + i, inputs, pi_a, pi_b, pi_c);
    }
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("should linked proof validation pass", async () => {
    expect(await verifier.verifyLinkedProofs(signerAddress, [101, 102])).not.to.throw;
    expect(await verifier.verifyLinkedProofs(signerAddress, [100, 103])).not.to.throw;
  });

  it("should linked proof validation fail", async () => {
    await expect(verifier.verifyLinkedProofs(signerAddress, [100, 101])).to.be.rejectedWith(
      "LinkedProofError",
    );
    await expect(verifier.verifyLinkedProofs(signerAddress, [102, 103])).to.be.rejectedWith(
      "LinkedProofError",
    );

    await expect(verifier.verifyLinkedProofs(signerAddress, [102])).to.be.rejectedWith(
      "Linked proof verification needs more than 1 request",
    );
    await expect(
      verifier.verifyLinkedProofs(await signer2.getAddress(), [101, 102]),
    ).to.be.rejectedWith(`Can't find linkID for given request Ids and user address`);
  });
});
