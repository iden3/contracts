import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { packV3ValidatorParams } from "../../utils/validator-pack-utils";
import { calculateQueryHash } from "../../utils/query-hash-utils";
import { ethers } from "hardhat";

const tenYears = 315360000;
const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in published onchain. Revocation State is published onchain. BJJ Proof",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_v3.json"),
    setProofExpiration: tenYears,
  },
  {
    name: "Validation of Sig proof failed",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/invalid_bjj_user_genesis_v3.json"),
    errorMessage: "Proof is not valid",
    setProofExpiration: tenYears,
  },
  {
    name: "User state is not genesis but latest",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"),
    ],

    proofJson: require("./data/valid_bjj_user_first_v3.json"),
    setProofExpiration: tenYears,
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
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    allowedIssuers: [ethers.BigNumber.from(123)],
    errorMessage: "Issuer is not on the Allowed Issuers list",
  },
  {
    name: "Valid BJJ genesis proof with AuthEnabled=0 (eth address in challenge)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
  },
  // MTP Proofs
   {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof.",
    stateTransitions: [require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json")],
    proofJson: require("./data/valid_mtp_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    isMtpProof: true,
  },
  {
    name: "Validation of MTP proof failed",
    stateTransitions: [require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json")],
    proofJson: require("./data/invalid_mtp_user_genesis_v3.json"),
    errorMessage: "Proof is not valid",
    setProofExpiration: tenYears,
    isMtpProof: true
  },
  {
    name: "User state is not genesis but latest. MTP Proof.",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
      require("../common-data/user_from_genesis_state_to_first_transition_v3"),
    ],
    proofJson: require("./data/valid_mtp_user_first_v3.json"),
    setProofExpiration: tenYears,
    isMtpProof: true
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
    isMtpProof: true
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
    isMtpProof: true
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
    isMtpProof: true
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
    isMtpProof: true
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof.",
   stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_genesis_v3.json"),
    setProofExpiration: tenYears,
    allowedIssuers: [ethers.BigNumber.from(123)],
    errorMessage: 'Issuer is not on the Allowed Issuers list',
    isMtpProof: true
  },
  {
    name: "Valid MTP genesis proof with AuthEnabled=0 (eth address in challenge)",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json"),
    ],
    proofJson: require("./data/valid_mtp_user_genesis_auth_disabled_v3.json"),
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    isMtpProof: true,
  },
  // Auth Disabled invalid challenge
  // {
  //   name: "Valid BJJ genesis proof with AuthEnabled=0 (another id is sender)",
  //   stateTransitions: [
  //     require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3_wrong_id.json"),
  //   ],
  //   proofJson: require("./data/valid_bjj_user_genesis_auth_disabled_v3_wrong_id.json"),
  //   setProofExpiration: tenYears,
  //   errorMessage: "",
  //   ethereumBasedUser: true,
  // },
  // {
  //   name: "Valid MTP genesis proof with AuthEnabled=0 (another id is sender)",
  //   stateTransitions: [
  //     require("../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3_wrong_id.json"),
  //   ],
  //   proofJson: require("./data/valid_mtp_user_genesis_auth_disabled_v3_wrong_id.json"),
  //   setProofExpiration: tenYears,
  //   errorMessage: "Address in challenge is not a sender address",
  //   ethereumBasedUser: true,
  //   isMtpProof: true
  // },
  // Issuer Genesis State
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof",
    stateTransitions: [
      require("../common-data/user_from_genesis_state_to_first_transition_v3.json"),
    ],
    proofJson: require("./data/valid_bjj_user_first_issuer_genesis_v3.json"),
    setProofExpiration: tenYears,
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Atomic V3 Validator", function () {
  let state: any, v3, v3testWrapper: any, verifierWrapper: any;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierV3Wrapper",
      "CredentialAtomicQueryV3Validator"
    );
    state = contracts.state;
    v3 = contracts.validator;
    verifierWrapper = contracts.verifierWrapper;

    v3testWrapper = await ethers.deployContract("ValidatorTestWrapper", [v3.address]);
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
      const claimPathNotExists = 0;

      const query = {
        schema,
        claimPathKey,
        operator,
        slotIndex,
        value,
        circuitIds: ["credentialAtomicQueryV3OnChain"],
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
        nullifierSessionID: test.ethereumBasedUser ? "0" : "1234569",
        proofType: test.isMtpProof ? 2 : 1,
        verifierID: "21929109382993718606847853573861987353620810345503358891473103689157378049",
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      if (test.setProofExpiration) {
        await v3.setProofExpirationTimeout(test.setProofExpiration);
      }
      if (test.setRevStateExpiration) {
        await v3.setRevocationStateExpirationTimeout(test.setRevStateExpiration);
      }
      if (test.setGISTRootExpiration) {
        await v3.setGISTRootExpirationTimeout(test.setGISTRootExpiration);
      }
      if (test.errorMessage) {
        await expect(
          v3.verify(inputs, pi_a, pi_b, pi_c, packV3ValidatorParams(query, test.allowedIssuers))
        ).to.be.revertedWith(test.errorMessage);
      } else if (test.errorMessage === "") {
        await expect(
          v3.verify(inputs, pi_a, pi_b, pi_c, packV3ValidatorParams(query, test.allowedIssuers))
        ).to.be.reverted;
      } else {
        await v3testWrapper.verify(
          inputs,
          pi_a,
          pi_b,
          pi_c,
          packV3ValidatorParams(query, test.allowedIssuers)
        );
      }
    });
  }

  it("check inputIndexOf", async () => {
    const challengeIndx = await v3.inputIndexOf("challenge");
    expect(challengeIndx).to.be.equal(9);
  });
});
