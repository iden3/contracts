import { expect } from "chai";
import { ethers } from "hardhat";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { packValidatorParams } from "../../utils/validator-pack-utils";

const tenYears = 315360000;
const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/valid_sig_user_genesis.json"),
    setProofExpiration: tenYears,
  },
  {
    name: "Validation of proof failed",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/invalid_sig_user_genesis.json"),
    errorMessage: "",
    setProofExpiration: tenYears,
  },
  {
    name: "User state is not genesis but latest",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
    ],
    proofJson: require("./data/valid_sig_user_non_genesis.json"),
    setProofExpiration: tenYears,
  },
  {
    name: "The non-revocation issuer state is not expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    proofJson: require("./data/valid_sig_user_non_genesis.json"),
    setProofExpiration: tenYears,
  },
  {
    name: "The non-revocation issuer state is expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"), // proof was generated after this state transition
      require("../common-data/issuer_next_state_transition.json"),
      require("../common-data/user_next_state_transition.json"),
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: require("./data/valid_sig_user_non_genesis.json"),
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Non-Revocation state of Issuer expired",
    setProofExpiration: tenYears,
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"), // proof was generated after this state transition
      require("../common-data/user_next_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: require("./data/valid_sig_user_non_genesis.json"), // generated on step 2
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Gist root is expired",
    setProofExpiration: tenYears,
  },
  {
    name: "The generated proof is expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    proofJson: require("./data/valid_sig_user_non_genesis.json"),
    errorMessage: "Generated proof is outdated",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/valid_sig_user_genesis.json"),
    setProofExpiration: tenYears,
    allowedIssuers: [ethers.BigNumber.from(123)],
    errorMessage: 'Issuer is not on the Allowed Issuers list'
  },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Atomic Sig Validator", function () {
  let state: any, sig: any;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigValidator"
    );
    state = contracts.state;
    sig = contracts.validator;
  });

  for (const test of testCases) {
    it(test.name, async function () {
      this.timeout(50000);
      for (let i = 0; i < test.stateTransitions.length; i++) {
        if (test.stateTransitionDelayMs) {
          await Promise.all([publishState(state, test.stateTransitions[i]), delay(test.stateTransitionDelayMs)]);
        } else {
          await publishState(state, test.stateTransitions[i]);
        }
      }

      const query = {
        schema: ethers.BigNumber.from("180410020913331409885634153623124536270"),
        claimPathKey: ethers.BigNumber.from(
          "8566939875427719562376598811066985304309117528846759529734201066483458512800"
        ),
        operator: ethers.BigNumber.from(1),
        slotIndex: ethers.BigNumber.from(0),
        value: [
          ethers.BigNumber.from("1420070400000000000"),
          ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
        ],
        queryHash: ethers.BigNumber.from(
          "1496222740463292783938163206931059379817846775593932664024082849882751356658"
        ),
        circuitIds: ["credentialAtomicQuerySigV2OnChain"],
        metadata: "test medatada",
        skipClaimRevocationCheck: false,
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      if (test.setProofExpiration) {
        await sig.setProofExpirationTimeout(test.setProofExpiration);
      }
      if (test.setRevStateExpiration) {
        await sig.setRevocationStateExpirationTimeout(test.setRevStateExpiration);
      }
      if (test.setGISTRootExpiration) {
        await sig.setGISTRootExpirationTimeout(test.setGISTRootExpiration);
      }
      if (test.errorMessage) {
        await expect(sig.verify(inputs, pi_a, pi_b, pi_c, packValidatorParams(query, test.allowedIssuers))).to.be.revertedWith(
          test.errorMessage
        );
      } else if (test.errorMessage === "") {
        await expect(sig.verify(inputs, pi_a, pi_b, pi_c, packValidatorParams(query, test.allowedIssuers))).to.be.reverted;
      } else {
        await sig.verify(inputs, pi_a, pi_b, pi_c, packValidatorParams(query, test.allowedIssuers));
      }
    });
  }

  it ('check inputIndexOf', async () => {
    const challengeIndx = await sig.inputIndexOf('challenge');
    expect(challengeIndx).to.be.equal(5);
  });
});
