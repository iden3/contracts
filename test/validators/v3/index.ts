import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { packV3ValidatorParams } from "../../utils/validator-pack-utils";
import { calculateQueryHash } from "../../utils/query-hash-utils";

const tenYears = 315360000;
const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in published onchain. Revocation State is published onchain. BJJ Proof",
    stateTransitions: [require("../common-data/issuer_genesis_state_v3.json")],
    proofJson: require("./data/valid_bjj_user_genesis_v3.json"),
    setProofExpiration: tenYears,
  },
  // {
  //   name: "Validation of proof failed",
  //   stateTransitions: [require("../common-data/issuer_genesis_state.json")],
  //   proofJson: require("./data/invalid_sig_user_genesis.json"),
  //   errorMessage: "",
  //   setProofExpiration: tenYears,
  // },
  // {
  //   name: "User state is not genesis but latest",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //     require("../common-data/user_state_transition.json"),
  //   ],
  //   proofJson: require("./data/valid_sig_user_non_genesis.json"),
  //   setProofExpiration: tenYears,
  // },
  // {
  //   name: "The non-revocation issuer state is not expired",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //     require("../common-data/user_state_transition.json"),
  //     require("../common-data/issuer_next_state_transition.json"),
  //   ],
  //   proofJson: require("./data/valid_sig_user_non_genesis.json"),
  //   setProofExpiration: tenYears,
  // },
  // {
  //   name: "The non-revocation issuer state is expired",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //     require("../common-data/user_state_transition.json"), // proof was generated after this state transition
  //     require("../common-data/issuer_next_state_transition.json"),
  //     require("../common-data/user_next_state_transition.json"),
  //   ],
  //   stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
  //   proofJson: require("./data/valid_sig_user_non_genesis.json"),
  //   setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
  //   errorMessage: "Non-Revocation state of Issuer expired",
  //   setProofExpiration: tenYears,
  // },
  // {
  //   name: "GIST root expired, Issuer revocation state is not expired",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //     require("../common-data/user_state_transition.json"), // proof was generated after this state transition
  //     require("../common-data/user_next_state_transition.json"),
  //     require("../common-data/issuer_next_state_transition.json"),
  //   ],
  //   stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
  //   proofJson: require("./data/valid_sig_user_non_genesis.json"), // generated on step 2
  //   setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
  //   errorMessage: "Gist root is expired",
  //   setProofExpiration: tenYears,
  // },
  // {
  //   name: "The generated proof is expired",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //     require("../common-data/user_state_transition.json"),
  //     require("../common-data/issuer_next_state_transition.json"),
  //   ],
  //   proofJson: require("./data/valid_sig_user_non_genesis.json"),
  //   errorMessage: "Generated proof is outdated",
  // },
  // {
  //   name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
  //   stateTransitions: [require("../common-data/issuer_genesis_state.json")],
  //   proofJson: require("./data/valid_sig_user_genesis.json"),
  //   setProofExpiration: tenYears,
  //   allowedIssuers: [ethers.BigNumber.from(123)],
  //   errorMessage: 'Issuer is not on the Allowed Issuers list'
  // },
  // {
  //   name: "Non merklized SigProof (AuthEnabled=0)",
  //   stateTransitions: [],
  //   proofJson: require("./data/non-merk-sig-proof-no-auth.json"),
  //   setProofExpiration: tenYears,
  //   errorMessage: "Address in challenge is not a sender address",
  //   authEnabled: 0
  // },
  // {
  //   name: "Non merklized MTPProof (AuthEnabled=0)",
  //   proofJson: require("./data/non-merk-mtp-proof-no-auth.json"),
  //   stateTransitions: [],
  //   setProofExpiration: tenYears,
  //   errorMessage: "Address in challenge is not a sender address",
  //   authEnabled: 0,
  //   skipValidation: true
  // },
  //  {
  //   name: "Non merklized SigProof (AuthEnabled=1)",
  //   proofJson: require("./data/non-merk-sig-proof-auth.json"),
  //   stateTransitions: [],
  //   setProofExpiration: tenYears,
  //   authEnabled: 1,
  //   skipValidation: true
  // },
  //  {
  //   name: "Non merklized MTPProof (AuthEnabled=1)",
  //   proofJson: require("./data/non-merk-mtp-proof-auth.json"),
  //   stateTransitions: [],
  //   setProofExpiration: tenYears,
  //   authEnabled: 1,
  //   skipValidation: true
  // }
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.only("Atomic V3 Validator", function () {
  let state: any, v3: any, verifierWrapper: any;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierV3Wrapper",
      "CredentialAtomicQueryV3Validator"
    );
    state = contracts.state;
    v3 = contracts.validator;
    verifierWrapper = contracts.verifierWrapper;
  });

  for (const test of testCases) {
    if (test.skipValidation) {
      continue;
    }
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
      const slotIndex = 0;
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
        groupID: 0,
        nullifierSessionID: "1234569",
        proofType: 1,
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
        await v3.verify(
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

  it("check verifier wrapper", async () => {
    for (const test of testCases) {
      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      const valid = await verifierWrapper.verify(pi_a, pi_b, pi_c, inputs);
      expect(valid).to.be.equal(true);
    }
  });
});
