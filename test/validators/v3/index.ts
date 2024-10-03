import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { packV3ValidatorParams } from "../../utils/validator-pack-utils";
import { calculateQueryHashV3 } from "../../utils/query-hash-utils";

const tenYears = 315360000;
const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in published onchain. Revocation State is published onchain. BJJ Proof",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validation of Sig proof failed",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/invalid_bjj_user_genesis_v3.json"),
    errorMessage: "Proof is not valid",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "User state is not genesis but latest",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"),
    ],

    proofJson: require("./data/valid_bjj_user_first_v3.json"),
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The non-revocation issuer state is latest",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"),
      require("../common-data/issuer_from_first_state_to_second_transition_v3"),
    ],
    proofJson: require("./data/valid_bjj_user_first_issuer_second_v3"),
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The non-revocation issuer state is expired",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"), //  // proof was generated after this state transition
      require("../common-data/issuer_from_first_state_to_second_transition_v3"),
      require("../common-data/user_from_first_state_to_second_transition_v3"),
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: require("./data/valid_bjj_user_second_issuer_first_v3"),
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Non-Revocation state of Issuer expired",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"), // proof was generated after this state transition
      require("../common-data/issuer_from_first_state_to_second_transition_v3"),
      require("../common-data/user_from_first_state_to_second_transition_v3"),
    ],
    proofJson: require("./data/valid_bjj_user_first_v3"),

    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Gist root is expired",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The generated proof is expired",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/issuer_from_first_state_to_second_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_first_v3.json"),
    errorMessage: "Generated proof is outdated",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "Issuer is not on the Allowed Issuers list",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (UserID correspond to the sender)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  // MTP Proofs
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validation of MTP proof failed",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/invalid_mtp_user_genesis_v3.json"),
    errorMessage: "Proof is not valid",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "User state is not genesis but latest. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"),
    ],
    proofJson: require("./data/valid_mtp_user_first_v3.json"),
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The non-revocation issuer state is not expired. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"), //  // proof was generated after this state transition
      require("../common-data/issuer_from_first_state_to_second_transition_v3"),
    ],
    proofJson: require("./data/valid_mtp_user_first_issuer_second_v3.json"),
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The non-revocation issuer state is expired. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"), //  // proof was generated after this state transition
      require("../common-data/issuer_from_first_state_to_second_transition_v3"),
      require("../common-data/user_from_first_state_to_second_transition_v3"),
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: require("./data/valid_mtp_user_second_issuer_first_v3.json"),
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Non-Revocation state of Issuer expired",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"), // proof was generated after this state transition
      require("../common-data/issuer_from_first_state_to_second_transition_v3"),
      require("../common-data/user_from_first_state_to_second_transition_v3"),
    ],
    proofJson: require("./data/valid_mtp_user_first_v3"),
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Gist root is expired",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The generated proof is expired. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/issuer_from_first_state_to_second_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_first_v3.json"),
    errorMessage: "Generated proof is outdated",
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "Issuer is not on the Allowed Issuers list",
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Valid MTP genesis proof with isBJJAuthEnabled=0 (UserID correspond to the sender)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  // Auth Disabled. UserID does NOT correspond to the sender
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (UserID does NOT correspond to the sender)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3_wrong_id.json"),
    setProofExpiration: tenYears,
    errorMessage: "UserID does not correspond to the sender",
    ethereumBasedUser: true,
    sender: "0x6edFa588aFd58803F728AbC91984c69528C00854",
  },
  {
    name: "Valid MTP genesis proof with isBJJAuthEnabled=0 (UserID does NOT correspond to the sender)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_genesis_auth_disabled_v3_wrong_id.json"),
    setProofExpiration: tenYears,
    errorMessage: "UserID does not correspond to the sender",
    ethereumBasedUser: true,
    isMtpProof: true,
    sender: "0x6edFa588aFd58803F728AbC91984c69528C00854",
  },
  // Issuer Genesis State
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof",
    stateTransitions: [
      require("../common-data/user_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_first_issuer_genesis_v3.json"),
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  // Wrong challenge
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof (Challenge should match the sender)",
    stateTransitions: [
      require("../common-data/user_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_first_issuer_genesis_v3.json"),
    errorMessage: "Challenge should match the sender",
    setProofExpiration: tenYears,
    sender: "0x0000000000000000000000000000000000000000",
  },
  // Invalid Link ID pub signal
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Invalid Link ID pub signal)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "Invalid Link ID pub signal",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    groupID: 0,
  },
  // Proof type should match the requested one in query
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Proof type should match the requested one in query)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "Proof type should match the requested one in query",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    isMtpProof: true,
  },
  // Invalid nullify pub signal
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Invalid nullify pub signal)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "Invalid nullify pub signal",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    nullifierSessionId: "2",
  },
  // Query hash does not match the requested one
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Query hash does not match the requested one)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "Query hash does not match the requested one",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    queryHash: BigInt(0),
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Atomic V3 Validator", function () {
  let state: any, v3validator;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);

    const { state: stateContract } = await deployHelper.deployState(["0x0112"]);
    state = stateContract;

    const contracts = await deployHelper.deployValidatorContracts("v3", await state.getAddress());
    v3validator = contracts.validator;
  });

  for (const test of testCases) {
    it(test.name, async function () {
      this.timeout(50000);
      for (let i = 0; i < test.stateTransitions.length; i++) {
        if (test.stateTransitionDelayMs) {
          await Promise.all([
            publishState(state, test.stateTransitions[i]),
            delay(test.stateTransitionDelayMs),
          ]);
        } else {
          await publishState(state, test.stateTransitions[i]);
        }
      }

      const value = ["20010101", ...new Array(63).fill("0")];

      const schema = "267831521922558027206082390043321796944";
      const slotIndex = test.isMtpProof ? 2 : 0;
      const operator = 2;
      const claimPathKey =
        "20376033832371109177683048456014525905119173674985843915445634726167450989630";
      const valueArrSize = 1;
      const nullifierSessionId = test.ethereumBasedUser ? "0" : "1234569";
      const verifierId =
        "21929109382993718606847853573861987353620810345503358891473103689157378049";
      const queryHash = calculateQueryHashV3(
        value,
        schema,
        slotIndex,
        operator,
        claimPathKey,
        valueArrSize,
        1,
        1,
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
        queryHash: test.queryHash == undefined ? queryHash : test.queryHash,
        groupID: test.groupID == undefined ? 1 : test.groupID,
        nullifierSessionID:
          test.nullifierSessionId == undefined ? nullifierSessionId : test.nullifierSessionId,
        proofType: test.isMtpProof ? 2 : 1,
        verifierID: verifierId,
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      if (test.setProofExpiration) {
        await v3validator.setProofExpirationTimeout(test.setProofExpiration);
      }
      if (test.setRevStateExpiration) {
        await v3validator.setRevocationStateExpirationTimeout(test.setRevStateExpiration);
      }
      if (test.setGISTRootExpiration) {
        await v3validator.setGISTRootExpirationTimeout(test.setGISTRootExpiration);
      }

      const packedParams = packV3ValidatorParams(query, test.allowedIssuers);

      if (test.errorMessage) {
        await expect(
          v3validator.verify(inputs, pi_a, pi_b, pi_c, packedParams, test.sender),
        ).to.be.rejectedWith(test.errorMessage);
      } else if (test.errorMessage === "") {
        await expect(v3validator.verify(inputs, pi_a, pi_b, pi_c, packedParams, test.sender)).to.be
          .reverted;
      } else {
        await v3validator.verify(inputs, pi_a, pi_b, pi_c, packedParams, test.sender);
      }
    });
  }
});
