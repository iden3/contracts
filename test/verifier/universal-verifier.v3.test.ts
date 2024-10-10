import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";
import { expect } from "chai";

describe("Universal Verifier V3 validator", function () {
  let verifier: any, v3: any, state: any;
  let signer, signer2;
  let deployHelper: DeployHelper;

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
    circuitIds: ["credentialAtomicQueryV3OnChain-beta.1"],
    skipClaimRevocationCheck: false,
    queryHash,
    groupID: 1,
    nullifierSessionID: nullifierSessionId, // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: verifierId,
  };

  const proofJson = require("../validators/v3/data/valid_bjj_user_genesis_auth_disabled_v3.json");
  const stateTransition1 = require("../validators/common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json");

  const stateTransition11 = require("../validators/common-data/issuer_from_genesis_state_to_first_transition_v3.json");
  const stateTransition12 = require("../validators/common-data/user_from_genesis_state_to_first_transition_v3.json");
  const stateTransition13 = require("../validators/common-data/issuer_from_first_state_to_second_transition_v3.json");

  const initializeState = async () => {
    deployHelper = await DeployHelper.initialize(null, true);

    const { state: stateContract } = await deployHelper.deployState(["0x0112"]);
    state = stateContract;
    const verifierLib = await deployHelper.deployVerifierLib();
    const contracts = await deployHelper.deployValidatorContracts("v3", await state.getAddress());
    v3 = contracts.validator;
    verifier = await deployHelper.deployUniversalVerifier(
      signer,
      await state.getAddress(),
      await verifierLib.getAddress(),
    );
    await verifier.addValidatorToWhitelist(await v3.getAddress());
    await verifier.connect();
  };

  before(async () => {
    [signer, signer2] = await ethers.getSigners();

    await initializeState();
  });

  it("Test submit response", async () => {
    await publishState(state, stateTransition1);
    const data = packV3ValidatorParams(query);
    await verifier.setZKPRequest(32, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });
    await v3.setProofExpirationTimeout(315360000);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await verifier.verifyZKPResponse(
      32,
      inputs,
      pi_a,
      pi_b,
      pi_c,
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    );

    await expect(verifier.submitZKPResponse(32, inputs, pi_a, pi_b, pi_c)).not.to.be.rejected;
  });

  it("Test submit response fails with UserID does not correspond to the sender", async () => {
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer2).submitZKPResponse(32, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("UserID does not correspond to the sender");
  });

  it("Test submit response fails with Issuer is not on the Allowed Issuers list", async () => {
    const data = packV3ValidatorParams(query, ["1"]);
    await verifier.setZKPRequest(33, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer).submitZKPResponse(33, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("Issuer is not on the Allowed Issuers list");
  });

  it("Test submit response fails with Invalid Link ID pub signal", async () => {
    const query2 = {
      ...query,
    };
    query2.groupID = 0;
    const data = packV3ValidatorParams(query2);
    await verifier.setZKPRequest(34, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer).submitZKPResponse(34, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("Invalid Link ID pub signal");
  });

  it("Test submit response fails with Proof type should match the requested one in query", async () => {
    const query2 = {
      ...query,
    };
    query2.proofType = 2;
    const data = packV3ValidatorParams(query2);
    await verifier.setZKPRequest(35, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer).submitZKPResponse(35, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("Proof type should match the requested one in query");
  });

  it("Test submit response fails with Invalid nullify pub signal", async () => {
    const query2 = {
      ...query,
    };
    query2.nullifierSessionID = "2";
    const data = packV3ValidatorParams(query2);
    await verifier.setZKPRequest(36, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer).submitZKPResponse(36, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("Invalid nullify pub signal");
  });

  it("Test submit response fails with Query hash does not match the requested one", async () => {
    const query2 = {
      ...query,
    };
    query2.queryHash = BigInt(0);
    const data = packV3ValidatorParams(query2);
    await verifier.setZKPRequest(37, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer).submitZKPResponse(37, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("Query hash does not match the requested one");
  });

  it("Test submit response fails with Generated proof is outdated", async () => {
    await initializeState();

    await publishState(state, stateTransition11);
    await publishState(state, stateTransition12);
    await publishState(state, stateTransition13);

    const data = packV3ValidatorParams(query);
    await verifier.setZKPRequest(37, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await expect(
      verifier.connect(signer).submitZKPResponse(37, inputs, pi_a, pi_b, pi_c),
    ).to.be.rejectedWith("Generated proof is outdated");
  });
});
