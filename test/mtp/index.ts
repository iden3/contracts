import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { expect } from "chai";
import { deployToken, deployContracts } from "./deploy";
import { prepareInputs, publishState } from "./utils";

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
    const contracts = await deployContracts();
    state = contracts.state;
    mtp = contracts.mtp;
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

  it("Example token test", async () => {
    const token: any = await deployToken(mtp.address);
    await publishState(state, require("./data/user_state_transition.json"));

    await publishState(state, require("./data/stateTransitionAgeClaim.json"));

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(
      require("./data/mpt_token_example.json")
    );

    const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const verified = await mtp.verify(inputs, pi_a, pi_b, pi_c);
    expect(verified).to.be.true;
    await token.mint(account, inputs, pi_a, pi_b, pi_c);
    expect(await token.balanceOf(account)).to.equal(5);

    await expect(
      token.mint(account, inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("identity can't mint token more than once");
    expect(await token.balanceOf(account)).to.equal(5);
  });
});
