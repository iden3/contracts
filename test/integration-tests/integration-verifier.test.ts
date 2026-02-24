import { network } from "hardhat";
import { prepareInputs } from "../utils/state-utils";
import authV2ProofJson from "./data/user_genesis_authV2.json";
import authV3ProofJson from "./data/user_genesis_authV3.json";
import authInvalidChallengeProofJson from "./data/user_genesis_auth_challenge_invalid.json";
import v3ProofJson from "./data/user_claim_issued_on_userid_v3.json";
import linkedProofJson from "./data/user_linked_multi_query.json";
import { packZKProof } from "../utils/packData";
import { expect } from "chai";
import {
  packLinkedMultiQueryValidatorParams,
  packV3ValidatorParams,
} from "../utils/validator-pack-utils";
import { calculateGroupId, calculateMultiRequestId, CircuitId } from "@0xpolygonid/js-sdk";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";
import { chainIdInfoMap, contractsInfo, TEN_YEARS } from "../../helpers/constants";
import CredentialAtomicQueryV3ValidatorModule from "../../ignition/modules/deployEverythingBasicStrategy/credentialAtomicQueryV3Validator";
import { getChainId } from "../../helpers/helperUtils";
import AuthV2ValidatorModule from "../../ignition/modules/deployEverythingBasicStrategy/authV2Validator";
import LinkedMultiQueryValidatorModule from "../../ignition/modules/deployEverythingBasicStrategy/linkedMultiQueryValidator";
import AuthV3ValidatorModule from "../../ignition/modules/deployEverythingBasicStrategy/authV3Validator";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("Verifier Integration test", async function () {
  let verifier, verifierLib, v3Validator, lmqValidator;
  let signer;

  const requestIdV3 = 32;
  const requestIdLMK = 33;
  const groupID = calculateGroupId();

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
  const authMethodV2 = "authV2";
  const authMethodV3 = "authV3";
  const authMethodEmbeddedAuth = "embeddedAuth";

  let stateAuthMethod: "authV2" | "authV3" = "authV2";

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
    circuitIds: ["linkedMultiQuery10-beta.1"],
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

    const verifierLib = await ethers.deployContract(contractsInfo.VERIFIER_LIB.name);
    const verifier = await ethers.deployContract("VerifierTestWrapper", [], {
      libraries: {
        VerifierLib: await verifierLib.getAddress(),
      },
    });
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

    const { state: stateAuthV2, authV2Validator } = await ignition.deploy(AuthV2ValidatorModule, {
      parameters: parameters,
    });

    await authV2Validator.setProofExpirationTimeout(TEN_YEARS);
    await authV2Validator.setGISTRootExpirationTimeout(TEN_YEARS);

    const authMethodParamsV2 = {
      authMethod: authMethodV2,
      validator: await authV2Validator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthMethod(authMethodParamsV2);

    const { state: stateAuthV3, authV3Validator } = await ignition.deploy(AuthV3ValidatorModule, {
      parameters: parameters,
    });
    await authV3Validator.setProofExpirationTimeout(TEN_YEARS);
    await authV3Validator.setGISTRootExpirationTimeout(TEN_YEARS);

    const authMethodParamsV3 = {
      authMethod: authMethodV3,
      validator: await authV3Validator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthMethod(authMethodParamsV3);

    const authMethodEmbeddedAuthParams = {
      authMethod: authMethodEmbeddedAuth,
      validator: ethers.ZeroAddress,
      params: "0x",
    };
    await verifier.setAuthMethod(authMethodEmbeddedAuthParams);

    const { credentialAtomicQueryV3Validator: v3Validator } = await ignition.deploy(
      CredentialAtomicQueryV3ValidatorModule,
      {
        parameters: parameters,
      },
    );

    let state;
    switch (stateAuthMethod) {
      case "authV2":
        state = stateAuthV2;
        break;
      case "authV3":
        state = stateAuthV3;
        break;
      default:
        throw new Error(`Unsupported stateAuthMethod: ${stateAuthMethod}`);
    }

    // In tests ignition does not store previous module deployments,
    // so we need to set the parameters manually for the modules to use
    // the same state contract instance
    await verifier.initialize(await state.getAddress());

    await v3Validator.setStateAddress(await state.getAddress());
    await v3Validator.setProofExpirationTimeout(TEN_YEARS);
    await v3Validator.setGISTRootExpirationTimeout(TEN_YEARS);

    const { linkedMultiQueryValidator: lmkValidator } = await ignition.deploy(
      LinkedMultiQueryValidatorModule,
      {
        parameters: parameters,
      },
    );

    return {
      state,
      verifier,
      verifierLib,
      v3Validator,
      lmkValidator,
    };
  }

  beforeEach(async () => {
    ({
      verifier,
      verifierLib,
      v3Validator,
      lmkValidator: lmqValidator,
    } = await networkHelpers.loadFixture(deployContractsFixture));

    await verifier.setVerifierID(query.verifierID);
  });

  it("Should revert with ChallengeIsInvalid for auth proof", async function () {
    const authInvalidChallengeProof = getProof(authInvalidChallengeProofJson);

    await verifier.setRequests([
      {
        requestId: requestIdV3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        creator: signer.address,
        params: v3Params,
      },
      {
        requestId: requestIdLMK,
        metadata: "metadata",
        validator: await lmqValidator.getAddress(),
        creator: signer.address,
        params: twoQueriesParams,
      },
    ]);

    await expect(
      verifier.submitResponse(
        {
          authMethod: authMethodV2,
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
    ).to.be.revertedWithCustomError(verifier, "ChallengeIsInvalid");
  });

  it("Should revert with MissingUserIDInGroupOfRequests", async function () {
    const groupID = calculateGroupId();

    const twoQueriesParamsNew = packLinkedMultiQueryValidatorParams({ ...twoQueries, groupID });

    await expect(
      verifier.setRequests([
        {
          requestId: requestIdLMK,
          metadata: "metadata",
          validator: await lmqValidator.getAddress(),
          creator: signer.address,
          params: twoQueriesParamsNew,
        },
        {
          requestId: requestIdLMK + 1,
          metadata: "metadata",
          validator: await lmqValidator.getAddress(),
          creator: signer.address,
          params: twoQueriesParamsNew,
        },
      ]),
    )
      .to.be.revertedWithCustomError(verifierLib, "MissingUserIDInGroupOfRequests")
      .withArgs(groupID);
  });

  it("Should revert with GroupMustHaveAtLeastTwoRequests", async function () {
    const groupID = calculateGroupId();

    const twoQueriesParamsNew = packLinkedMultiQueryValidatorParams({ ...twoQueries, groupID });

    await expect(
      verifier.setRequests([
        {
          requestId: requestIdLMK,
          metadata: "metadata",
          validator: await lmqValidator.getAddress(),
          creator: signer.address,
          params: twoQueriesParamsNew,
        },
      ]),
    )
      .to.be.revertedWithCustomError(verifierLib, "GroupMustHaveAtLeastTwoRequests")
      .withArgs(groupID);
  });

  it("Should revert with GroupIdNotValid", async function () {
    const groupID = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

    const twoQueriesParamsNew = packLinkedMultiQueryValidatorParams({ ...twoQueries, groupID });
    const v3ParamsNew = packV3ValidatorParams({ ...query, groupID });
    await expect(
      verifier.setRequests([
        {
          requestId: requestIdV3,
          metadata: "metadata",
          validator: await v3Validator.getAddress(),
          creator: signer.address,
          params: v3ParamsNew,
        },
        {
          requestId: requestIdLMK,
          metadata: "metadata",
          validator: await lmqValidator.getAddress(),
          creator: signer.address,
          params: twoQueriesParamsNew,
        },
      ]),
    )
      .to.be.revertedWithCustomError(verifierLib, "GroupIdNotValid")
  });

  it("Should verify with authV2 authMethod", async function () {
    // An integration test with a MultiRequest
    // The multiRequest has a single group with two requests inside
    // One request is based on V3 validator
    // Another one is based on LinkedMultiQuery validator
    const authProof = getProof(authV2ProofJson);

    // 1. Create the requests
    await verifier.setRequests([
      {
        requestId: requestIdV3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        creator: signer.address,
        params: v3Params,
      },
      {
        requestId: requestIdLMK,
        metadata: "metadata",
        validator: await lmqValidator.getAddress(),
        creator: signer.address,
        params: twoQueriesParams,
      },
    ]);

    const multiRequest = {
      multiRequestId: calculateMultiRequestId([], [groupID], signer.address),
      requestIds: [],
      groupIds: [groupID],
      metadata: "0x",
    };

    // 2. Create the multi-request
    await expect(verifier.setMultiRequest(multiRequest)).not.to.revert(ethers);
    const multiRequestIdExists = await verifier.multiRequestIdExists(multiRequest.multiRequestId);
    expect(multiRequestIdExists).to.be.true;

    let areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(areMultiRequestProofsVerified).to.be.false;
    // 3. Submitting a response with valid proofs
    await expect(
      verifier.submitResponse(
        {
          authMethod: authMethodV2,
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
    ).not.to.revert(ethers);

    areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(areMultiRequestProofsVerified).to.be.true;
  });

  it("Should verify with authV3 authMethod", async function () {
    // An integration test with a MultiRequest
    // The multiRequest has a single group with two requests inside
    // One request is based on V3 validator
    // Another one is based on LinkedMultiQuery validator
    stateAuthMethod = "authV3";
    ({
      verifier,
      verifierLib,
      v3Validator,
      lmkValidator: lmqValidator,
    } = await networkHelpers.loadFixture(deployContractsFixture));

    await verifier.setVerifierID(query.verifierID);
    
    const authProof = getProof(authV3ProofJson);

    // 1. Create the requests
    await verifier.setRequests([
      {
        requestId: requestIdV3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        creator: signer.address,
        params: v3Params,
      },
      {
        requestId: requestIdLMK,
        metadata: "metadata",
        validator: await lmqValidator.getAddress(),
        creator: signer.address,
        params: twoQueriesParams,
      },
    ]);

    const multiRequest = {
      multiRequestId: calculateMultiRequestId([], [groupID], signer.address),
      requestIds: [],
      groupIds: [groupID],
      metadata: "0x",
    };

    // 2. Create the multi-request
    await expect(verifier.setMultiRequest(multiRequest)).not.to.revert(ethers);
    const multiRequestIdExists = await verifier.multiRequestIdExists(multiRequest.multiRequestId);
    expect(multiRequestIdExists).to.be.true;

    let areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(areMultiRequestProofsVerified).to.be.false;

    // 3. Submitting a response with valid proofs
    await expect(
      verifier.submitResponse(
        {
          authMethod: authMethodV3,
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
    ).not.to.revert(ethers);

    areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(areMultiRequestProofsVerified).to.be.true;
  });

  it("Should verify with embeddedAuth authMethod", async function () {
    // An integration test with a MultiRequest
    // The multiRequest has a single group with two requests inside
    // One request is based on V3 validator
    // Another one is based on LinkedMultiQuery validator

    // 1. Create the requests
    await verifier.setRequests([
      {
        requestId: requestIdV3,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        creator: signer.address,
        params: v3Params,
      },
      {
        requestId: requestIdLMK,
        metadata: "metadata",
        validator: await lmqValidator.getAddress(),
        creator: signer.address,
        params: twoQueriesParams,
      },
    ]);

    const multiRequest = {
      multiRequestId: calculateMultiRequestId([], [groupID], signer.address),
      requestIds: [],
      groupIds: [groupID],
      metadata: "0x",
    };

    // 2. Create the multi-request
    await expect(verifier.setMultiRequest(multiRequest)).not.to.revert(ethers);
    const multiRequestIdExists = await verifier.multiRequestIdExists(multiRequest.multiRequestId);
    expect(multiRequestIdExists).to.be.true;

    let areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(areMultiRequestProofsVerified).to.be.false;

    // 3. Submitting a response with valid proofs
    await expect(
      verifier.submitResponse(
        {
          authMethod: authMethodEmbeddedAuth,
          proof: "0x",
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
    ).not.to.be.revert(ethers);

    areMultiRequestProofsVerified = await verifier.areMultiRequestProofsVerified(
      multiRequest.multiRequestId,
      await signer.getAddress(),
    );
    expect(areMultiRequestProofsVerified).to.be.true;
  });
});
