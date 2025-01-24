import { ethers } from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { prepareInputs } from "../utils/state-utils";
import authProofJson from "./data/user_genesis_auth.json";
import authInvalidChallengeProofJson from "./data/user_genesis_auth_challenge_invalid.json";
import v3ProofJson from "./data/user_claim_issued_on_userid_v3.json";
import linkedProofJson from "./data/user_linked_multi_query.json";
import { packZKProof } from "../utils/packData";
import { expect } from "chai";
import {
  packLinkedMultiQueryValidatorParams,
  packV3ValidatorParams,
} from "../utils/validator-pack-utils";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";
import { TEN_YEARS } from "../../helpers/constants";

describe("Verifier Integration test", function () {
  let verifier, authValidator, v3Validator, lmkValidator;
  let signer;

  const requestIdV3 = 32;
  const requestIdLMK = 33;
  const groupID = 1;

  const value = ["20020101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 7;
  const claimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";
  const [merklized, isRevocationChecked, valueArrSize] = [1, 1, 1];
  const nullifierSessionId = "0";
  const verifierId = "21929109382993718606847853573861987353620810345503358891473103689157378049";
  const queryHash = calculateQueryHashV3(
    value,
    schema,
    slotIndex,
    operator,
    claimPathKey,
    valueArrSize,
    merklized,
    isRevocationChecked,
    verifierId,
    nullifierSessionId,
  );

  const query = {
    schema,
    claimPathKey,
    operator,
    slotIndex,
    value,
    circuitIds: [CircuitId.AtomicQueryV3OnChain],
    skipClaimRevocationCheck: false,
    queryHash,
    groupID: groupID,
    nullifierSessionID: nullifierSessionId, // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: verifierId,
  };

  const crossChainProofs = "0x";
  const metadatas = "0x";
  const authType = "authV2";

  const v3Params = packV3ValidatorParams(query);

  const twoQueries = {
    claimPathKey: [
      20376033832371109177683048456014525905119173674985843915445634726167450989630n,
      20376033832371109177683048456014525905119173674985843915445634726167450989630n,
    ],
    operator: [2, 6],
    slotIndex: [0, 0],
    value: [
      [20020101, ...new Array(63).fill(0)],
      [20030101, ...new Array(63).fill(0)],
    ],
    queryHash: [
      3326382892536126749483088946048689911243394580824744244053752370464747528203n,
      9907132056133666096701539062450765284880813426582692863734448403438789333698n,
    ],
    circuitIds: ["linkedMultiQuery10"],
    groupID: groupID,
    verifierID: verifierId,
  };

  const twoQueriesParams = packLinkedMultiQueryValidatorParams(twoQueries);

  const v3Proof = getProof(v3ProofJson);
  const lmqProof = getProof(linkedProofJson);

  function getProof(proofJson: any) {
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);
    return proof;
  }

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();

    const verifier = await ethers.deployContract("VerifierTestWrapper", []);

    const deployHelper = await DeployHelper.initialize(null, true);
    const { state } = await deployHelper.deployStateWithLibraries(["0x0212"]);
    await verifier.initialize(await state.getAddress());

    const { validator: authValidator } =
      await deployHelper.deployValidatorContractsWithVerifiers("authV2_forAuth");
    await authValidator.setProofExpirationTimeout(TEN_YEARS);
    await authValidator.setGISTRootExpirationTimeout(TEN_YEARS);

    const authType = {
      authType: "authV2",
      validator: await authValidator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthType(authType);

    const { validator: v3Validator } =
      await deployHelper.deployValidatorContractsWithVerifiers("v3");
    await v3Validator.setProofExpirationTimeout(TEN_YEARS);
    await v3Validator.setGISTRootExpirationTimeout(TEN_YEARS);

    const { validator: lmkValidator } =
      await deployHelper.deployValidatorContractsWithVerifiers("lmk");

    return { state, verifier, authValidator, v3Validator, lmkValidator };
  }

  beforeEach(async () => {
    ({ verifier, authValidator, v3Validator, lmkValidator } =
      await loadFixture(deployContractsFixture));

    await verifier.setVerifierID(query.verifierID);
  });

  it("Should revert with ChallengeIsInvalid for auth proof", async function () {
    const authInvalidChallengeProof = getProof(authInvalidChallengeProofJson);

    await verifier.setRequests([
      {
        requestId: requestIdV3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: v3Params,
      },
      {
        requestId: requestIdLMK,
        metadata: "metadata",
        validator: await lmkValidator.getAddress(),
        params: twoQueriesParams,
      },
    ]);

    await expect(
      verifier.submitResponse(
        {
          authType: authType,
          proof: authInvalidChallengeProof,
        },
        [
          {
            requestId: requestIdV3,
            proof: v3Proof,
            metadata: metadatas,
          },
          {
            requestId: requestIdLMK,
            proof: lmqProof,
            metadata: metadatas,
          },
        ],
        crossChainProofs,
      ),
    ).to.be.revertedWithCustomError(authValidator, "ChallengeIsInvalid");
  });

  it("Should verify", async function () {
    const authProof = getProof(authProofJson);

    // 1. Create the requests
    await verifier.setRequests([
      {
        requestId: requestIdV3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: v3Params,
      },
      {
        requestId: requestIdLMK,
        metadata: "metadata",
        validator: await lmkValidator.getAddress(),
        params: twoQueriesParams,
      },
    ]);

    const multiRequest = {
      multiRequestId: 1,
      requestIds: [],
      groupIds: [groupID],
      metadata: "0x",
    };

    // 2. Create the multi-request
    await expect(verifier.setMultiRequest(multiRequest)).not.to.be.reverted;
    const multiRequestIdExists = await verifier.multiRequestIdExists(multiRequest.multiRequestId);
    expect(multiRequestIdExists).to.be.true;

    let isMultiRequestVerified = await verifier.isMultiRequestVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(isMultiRequestVerified).to.be.false;

    // 3. Submitting a response with valid proofs
    await expect(
      verifier.submitResponse(
        {
          authType: authType,
          proof: authProof,
        },
        [
          {
            requestId: requestIdV3,
            proof: v3Proof,
            metadata: metadatas,
          },
          {
            requestId: requestIdLMK,
            proof: lmqProof,
            metadata: metadatas,
          },
        ],
        crossChainProofs,
      ),
    ).not.to.be.reverted;

    isMultiRequestVerified = await verifier.isMultiRequestVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(isMultiRequestVerified).to.be.true;
  });

  // An integration test with a MultiRequest
  // The multiRequest has a single group with two requests inside
  // One request is based on V3 validator
  // Another one is based on LinkedMultiQuery validator
});
