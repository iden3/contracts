import { ethers } from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { prepareInputs, publishState } from "../utils/state-utils";
import proofJson from "../validators/v3/data/valid_bjj_user_genesis_auth_disabled_v3.json";
import { packZKProof } from "../utils/packData";
import { expect } from "chai";
import stateTransition1 from "../validators/common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";

describe("Verifier Integration test", function () {
  let state, verifier, verifierLib, v3Validator, lmkValidator;

  const value = ["20010101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 2;
  const claimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";
  const [merklized, isRevocationChecked, valueArrSize] = [1, 1, 1];
  const nullifierSessionId = "0";
  const verifierId = 17579233777095132637855373104833123449544587564214798678344578844917276929n;
  const queryHash = calculateQueryHashV3(
    value,
    schema,
    slotIndex,
    operator,
    claimPathKey,
    valueArrSize,
    merklized,
    isRevocationChecked,
    verifierId.toString(),
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
    groupID: 1,
    nullifierSessionID: nullifierSessionId, // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: verifierId,
  };

  async function deployContractsFixture() {
    const verifierLib = await ethers.deployContract("VerifierLib");
    const verifier = await ethers.deployContract("VerifierTestWrapper", [], {
      libraries: { VerifierLib: await verifierLib.getAddress() },
    });

    const deployHelper = await DeployHelper.initialize(null, true);
    const { state } = await deployHelper.deployStateWithLibraries([]);
    await verifier.initialize(await state.getAddress());

    const authValidator = await ethers.deployContract("AuthV2Validator_forAuth");

    const authType = {
      authType: "authV2",
      validator: await authValidator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthType(authType);

    const { validator: v3Validator } = await deployHelper.deployValidatorContractsWithVerifiers(
      "v3",
      await state.getAddress(),
    );
    const { validator: lmkValidator } = await deployHelper.deployValidatorContractsWithVerifiers(
      "lmk",
      await state.getAddress(),
    );

    return { state, verifier, verifierLib, v3Validator, lmkValidator };
  }

  beforeEach(async () => {
    ({ state, verifier, verifierLib, v3Validator, lmkValidator } =
      await loadFixture(deployContractsFixture));
  });

  it("Should verify", async function () {
    const requestId = 32;

    await publishState(state, stateTransition1 as any);
    const params = packV3ValidatorParams(query);
    await verifier.setRequests([
      {
        requestId: requestId,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: params,
      },
      {
        requestId: requestId + 10,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: params,
      },
    ]);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);
    const crossChainProofs = "0x";
    const metadatas = "0x";

    const authType = "authV2";

    // await verifier.setVerifierID(verifierId);

    await expect(
      verifier.submitResponse(
        {
          authType: authType,
          proof,
        },
        [
          {
            requestId,
            proof,
            metadata: metadatas,
          },
        ],
        crossChainProofs,
      ),
    ).not.to.be.reverted;
  });

  // An integration test with a MultiRequest
  // The multiRequest has a single group with two requests inside
  // One request is based on V3 validator
  // Another one is based on LinkedMultiQuery validator
});
