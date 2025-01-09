import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";
import { expect } from "chai";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import proofJson from "../validators/v3/data/valid_bjj_user_genesis_auth_disabled_v3.json";
import stateTransition1 from "../validators/common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json";
import stateTransition11 from "../validators/common-data/issuer_from_genesis_state_to_first_transition_v3.json";
import stateTransition12 from "../validators/common-data/user_from_genesis_state_to_first_transition_v3.json";
import stateTransition13 from "../validators/common-data/issuer_from_first_state_to_second_transition_v3.json";
import { packZKProof } from "../utils/packData";
import { TEN_YEARS } from "../../helpers/constants";

const storageFields = [
  {
    name: "issuerID",
    value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
  },
  {
    name: "userID",
    value: 23013175891893363078841232968022302880776034013620341061794940968520126978n,
  },
  { name: "timestamp", value: 1642074362n },
  {
    name: "linkID",
    value: 19823993270096139446564592922993947503208333537792611306066620392561342309875n,
  },
  { name: "nullifier", value: 0 },
];

describe("Universal Verifier V3 validator", function () {
  let verifier: any, v3Validator: any, authV2Validator: any, state: any;
  let signer, signer2;
  let deployHelper: DeployHelper;

  const authType = "authV2";

  const value = ["20010101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 2;
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
    groupID: 1,
    nullifierSessionID: nullifierSessionId, // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: verifierId,
  };

  const initializeState = async () => {
    deployHelper = await DeployHelper.initialize(null, true);

    const { state: stateContract } = await deployHelper.deployStateWithLibraries(["0x0212"]);
    const verifierLib = await deployHelper.deployVerifierLib();
    const contracts = await deployHelper.deployValidatorContractsWithVerifiers(
      "v3",
      await stateContract.getAddress(),
    );
    const v3Validator = contracts.validator;
    const universalVerifier: any = await deployHelper.deployUniversalVerifier(
      signer,
      await stateContract.getAddress(),
      await verifierLib.getAddress(),
    );
    await universalVerifier.addValidatorToWhitelist(await v3Validator.getAddress());
    await universalVerifier.connect();

    const authV2Validator = await deployHelper.deployValidatorStub("AuthValidatorStub");

    return { stateContract, v3Validator, authV2Validator, universalVerifier };
  };

  async function deployContractsFixture() {
    const [ethSigner, ethSigner2] = await ethers.getSigners();
    const { stateContract, v3Validator, authV2Validator, universalVerifier } =
      await initializeState();
    return {
      ethSigner,
      ethSigner2,
      stateContract,
      universalVerifier,
      v3Validator,
      authV2Validator,
    };
  }

  async function checkStorageFields(verifier: any, requestId: bigint, storageFields: any[]) {
    for (const field of storageFields) {
      const value = await verifier.getResponseFieldValue(
        requestId,
        await signer.getAddress(),
        field.name,
      );
      expect(value).to.be.equal(field.value);
    }
  }

  before(async () => {
    ({
      ethSigner: signer,
      ethSigner2: signer2,
      stateContract: state,
      v3Validator: v3Validator,
      authV2Validator: authV2Validator,
      universalVerifier: verifier,
    } = await loadFixture(deployContractsFixture));
    await v3Validator.setProofExpirationTimeout(TEN_YEARS);
  });

  it("Test submit response", async () => {
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

    const requestStored = await verifier.getRequest(requestId);
    // check if the request is stored correctly checking metadata and validator
    expect(requestStored.metadata).to.be.equal("metadata");
    expect(requestStored.validator).to.be.equal(await v3Validator.getAddress());
    expect(requestStored.params).to.be.equal(params);
    expect(requestStored.creator).to.be.equal(await signer.getAddress());
    expect(requestStored.verifierId).to.be.equal(verifierId);

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: params,
    });
    const authRequestStored = await verifier.getAuthType(authType);
    expect(authRequestStored.validator).to.be.equal(await authV2Validator.getAddress());
    expect(authRequestStored.params).to.be.equal(params);
    expect(authRequestStored.isActive).to.be.equal(true);

    await v3Validator.setProofExpirationTimeout(TEN_YEARS);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = "0x";

    const metadatas = "0x";

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
    ).not.to.be.rejected;

    await checkStorageFields(verifier, BigInt(requestId), storageFields);
  });

  it("Test submit response fails with UserID does not correspond to the sender", async () => {
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const requestId = 32;

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = "0x";
    const metadatas = "0x";

    await expect(
      verifier.connect(signer2).submitResponse(
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
    ).to.be.rejectedWith("UserID does not correspond to the sender");
  });

  it("Test submit response fails with Issuer is not on the Allowed Issuers list", async () => {
    const query2 = { ...query };
    query2.groupID = 2;
    const params = packV3ValidatorParams(query2, ["1"]);
    const requestId = 33;

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

    await expect(
      verifier.connect(signer).submitResponse(
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
    ).to.be.rejectedWith("Issuer is not on the Allowed Issuers list");
  });

  it("Test submit response fails with Invalid Link ID pub signal", async () => {
    const query2 = {
      ...query,
    };
    query2.groupID = 0;
    const requestId = 34;
    const params = packV3ValidatorParams(query2);
    await verifier.setRequests([
      {
        requestId: requestId,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: params,
      },
    ]);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = "0x";
    const metadatas = "0x";

    await expect(
      verifier.connect(signer).submitResponse(
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
    ).to.be.rejectedWith("Invalid Link ID pub signal");
  });

  it("Test submit response fails with Proof type should match the requested one in query", async () => {
    const query2 = {
      ...query,
    };
    query2.proofType = 2;
    query2.groupID = 3;
    const requestId = 35;
    const params = packV3ValidatorParams(query2);
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

    await expect(
      verifier.connect(signer).submitResponse(
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
    ).to.be.rejectedWith("Proof type should match the requested one in query");
  });

  it("Test submit response fails with Invalid nullify pub signal", async () => {
    const query2 = {
      ...query,
    };
    query2.nullifierSessionID = "2";
    query2.groupID = 4;
    const requestId = 36;
    const params = packV3ValidatorParams(query2);
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

    await expect(
      verifier.connect(signer).submitResponse(
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
    ).to.be.rejectedWith("Invalid nullify pub signal");
  });

  it("Test submit response fails with Query hash does not match the requested one", async () => {
    const query2 = {
      ...query,
    };
    query2.queryHash = BigInt(0);
    query2.groupID = 5;
    const requestId = 37;
    const params = packV3ValidatorParams(query2);
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

    await expect(
      verifier.connect(signer).submitResponse(
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
    ).to.be.rejectedWith("Query hash does not match the requested one");
  });

  it("Test submit response fails with Generated proof is outdated", async () => {
    ({
      ethSigner: signer,
      ethSigner2: signer2,
      stateContract: state,
      v3Validator: v3Validator,
      universalVerifier: verifier,
    } = await loadFixture(deployContractsFixture));

    await publishState(state, stateTransition11 as any);
    await publishState(state, stateTransition12 as any);
    await publishState(state, stateTransition13 as any);

    const query2 = {
      ...query,
    };
    query2.groupID = 0;
    const params = packV3ValidatorParams(query2);
    const requestId = 37;
    await verifier.setRequests([
      {
        requestId: requestId,
        metadata: "metadata",
        validator: await v3Validator.getAddress(),
        params: params,
      },
    ]);

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: params,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = "0x";
    const metadatas = "0x";

    await expect(
      verifier.connect(signer).submitResponse(
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
    ).to.be.rejectedWith("Generated proof is outdated");
  });
});
