import { Groth16VerifierAnonAadhaarV1DeployHelper } from "../../helpers/DeployAnonAadharV1Validator";
import { prepareInputs } from "../utils/state-utils";
import proofJson from "../validators/sig/data/anon_aadhaar_proof.json";
import { expect } from "chai";
import { packZKProof } from "../utils/packData";

const emptyCrossChainProofs = new Uint8Array();

describe("Verify anon aadhaar proof onchain", async () => {
  it("Verify proof and issuer a credential", async () => {
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const inputsBytes = packZKProof(inputs, pi_a, pi_b, pi_c);
    const factory = await Groth16VerifierAnonAadhaarV1DeployHelper.initialize();
    const deployment = await factory.deployAnonAadhaarCredentialIssuing();

    const singleProof = [
      {
        requestId: 940499666,
        zkProof: inputsBytes,
        data: "0x",
      },
    ];

    const tx = await deployment.submitZKPResponseV2(singleProof, emptyCrossChainProofs);
    await tx.wait();
    const proof = await deployment.getClaimProof(inputs[3]);
    expect(proof[1]).to.be.true;

    await expect(
      deployment.submitZKPResponseV2(singleProof, emptyCrossChainProofs),
    ).to.be.revertedWith("Nullifier already exists");
  });
});
