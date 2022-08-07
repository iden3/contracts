import { expect } from "chai";
import {
  deployContracts,
  deployMtp,
  prepareInputs,
  publishState,
} from "../deploy-utils";

const testCases = [
  {
    name: "Validate Genesis User State/Issuer Claim IdenState is in Chain/Revocation State is in Chain",
    issuerStateTransitions: [require("./data/issuer_state_transition.json")],
    mtfProofJson: require("./data/valid_mtp.json"),
  },
  {
    name: "Validation of proof failed",
    issuerStateTransitions: [require("./data/issuer_state_transition.json")],
    mtfProofJson: require("./data/invalid_mtp.json"),
    errorMessage: "MTP Proof could not be verified",
  },

  {
    name: "User state is not genesis but latest",
    issuerStateTransitions: [require("./data/issuer_state_transition.json")],
    userStateTransition: require("./data/user_state_transition.json"),
    mtfProofJson: require("./data/user_non_genesis_mtp.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is not expired",
    issuerStateTransitions: [
      require("./data/issuer_state_transition.json"),
      require("./data/issuer_next_state_transition.json"),
    ],
    userStateTransition: require("./data/user_state_transition.json"),
    mtfProofJson: require("./data/user_non_genesis_mtp.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is expired",
    issuerStateTransitions: [
      require("./data/issuer_state_transition.json"),
      require("./data/issuer_next_state_transition.json"),
    ],
    userStateTransition: require("./data/user_state_transition.json"),
    mtfProofJson: require("./data/user_non_genesis_mtp.json"),
    setExpiration: 1,
    errorMessage: "Non-Revocation state of Issuer expired",
  },
];

describe("Atomic MTP Verifier", function () {
  let state: any, mtp: any;

  beforeEach(async () => {
    const contracts = await deployContracts(true);
    state = contracts.state;
    const contractsMtp = await deployMtp(state.address);
    mtp = contractsMtp.mtp;
  });

  for (const test of testCases) {
    it(test.name, async () => {
      for (const issuerStateJson of test.issuerStateTransitions) {
        await publishState(state, issuerStateJson);
      }

      if (test.userStateTransition) {
        await publishState(state, test.userStateTransition);
      }

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.mtfProofJson);
      if (test.errorMessage) {
        if (test.setExpiration) {
          await mtp.setRevocationStateExpirationTime(test.setExpiration);
        }

        (
          expect(mtp.verify(inputs, pi_a, pi_b, pi_c)).to.be as any
        ).revertedWith(test.errorMessage);
      } else {
        const verified = await mtp.verify(inputs, pi_a, pi_b, pi_c);
        expect(verified).to.be.true;
      }
    });
  }
});
