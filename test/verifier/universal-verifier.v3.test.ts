import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { calculateQueryHash } from "../utils/query-hash-utils";
import { expect } from "chai";

describe("Universal Verifier V3 validator", function () {
  let verifier: any, v3: any, state: any;
  let signer, signer2;
  let signerAddress: string, signer2Address: string;
  let deployHelper: DeployHelper;

  const value = ["20010101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 2;
  const claimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";
  const claimPathNotExists = 0;

  const query = {
    schema,
    claimPathKey,
    operator,
    slotIndex,
    value,
    circuitIds: ["credentialAtomicQueryV3OnChain-beta.0"],
    skipClaimRevocationCheck: false,
    claimPathNotExists,
    queryHash: calculateQueryHash(
      value,
      schema,
      slotIndex,
      operator,
      claimPathKey,
      claimPathNotExists
    ).toString(),
    groupID: 1,
    nullifierSessionID: "0", // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: "21929109382993718606847853573861987353620810345503358891473103689157378049",
  };

  const proofJson = require("../validators/v3/data/valid_bjj_user_genesis_auth_disabled_v3.json");
  const stateTransition1 = require("../validators/common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json");

  beforeEach(async () => {
    [signer, signer2] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier(signer);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierV3Wrapper",
      "CredentialAtomicQueryV3Validator"
    );
    v3 = contracts.validator;
    state = contracts.state;
    await verifier.addWhitelistedValidator(v3.address);
    await verifier.connect();
  });

  it("Test submit response", async () => {
    await publishState(state, stateTransition1);
    const data = packV3ValidatorParams(query);
    await verifier.setZKPRequest(0, {
      metadata: "metadata",
      validator: v3.address,
      data: data,
      controller: signerAddress,
      isDisabled: false,
    });
    await v3.setProofExpirationTimeout(315360000);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await verifier.verifyZKPResponse(
      0,
      inputs,
      pi_a,
      pi_b,
      pi_c,
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    );

    await expect(verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c)).not.to.be.reverted;
    await expect(
      verifier.connect(signer2).submitZKPResponse(0, inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("UserID does not correspond to the sender");
  });
});
