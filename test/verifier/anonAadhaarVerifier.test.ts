import { AnonAadhaarDeployHelper } from "../../helpers/DeployAnonAadharV1Validator";
import { prepareInputs } from "../utils/state-utils";
import proofJson from "../validators/sig/data/anon_aadhaar_proof.json";
import { expect } from "chai";
import { packZKProof } from "../utils/packData";
import { DeployHelper } from "../../helpers/DeployHelper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";

const emptyCrossChainProofs = new Uint8Array();
const requestId = 940499666;

describe("Verify anon aadhaar proof onchain", async () => {
  let issuer;

  before(async function () {
    const stDeployHelper = await DeployHelper.initialize();
    const basicContracts = await stDeployHelper.deployStateWithLibraries();
    const verifierLib = await stDeployHelper.deployVerifierLib();

    const poseidons = await deployPoseidons([3, 4]);

    const identityLib = await stDeployHelper.deployIdentityLib(
      await basicContracts.smtLib.getAddress(),
      await poseidons[0].getAddress(),
      await poseidons[1].getAddress(),
    );

    const f = await AnonAadhaarDeployHelper.initialize();
    issuer = await f.deployAnonAadhaarCredentialIssuing(
      await verifierLib.getAddress(),
      await identityLib.getAddress(),
      await basicContracts.state.getAddress(),
      basicContracts.defaultIdType,
    );
    await f.setZKPRequest(issuer, requestId, await basicContracts.state.getAddress());
    await f.setIssuerDidHash(
      issuer,
      "12146166192964646439780403715116050536535442384123009131510511003232108502337",
    );
  });

  it("Issue a credential and verify proof", async () => {
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const inputsBytes = packZKProof(inputs, pi_a, pi_b, pi_c);

    const singleProof = [
      {
        requestId: requestId,
        zkProof: inputsBytes,
        data: "0x",
      },
    ];

    const tx = await issuer.submitZKPResponseV2(singleProof, emptyCrossChainProofs);
    await tx.wait();
    const proof = await issuer.getClaimProof(inputs[2]);
    expect(proof[1]).to.be.true;

    await expect(issuer.submitZKPResponseV2(singleProof, emptyCrossChainProofs)).to.be.revertedWith(
      "Nullifier already exists",
    );
  });
});
