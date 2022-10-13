import { expect } from "chai";
import { ethers } from "hardhat";
import {
  deployERC20ZKPVerifierToken,
  deployValidatorContracts,
  prepareInputs,
  publishState,
} from "../utils/deploy-utils";

const testCases: any[] = [
  {
    name: "Validate Genesis User State/Issuer Claim IdenState is in Chain/Revocation State is in Chain",
    issuerStateTransitions: [require("./data/issuer_state_transition.json")],
    mtfProofJson: require("./data/valid_mtp_user_genesis.json"),
  },
  {
    name: "Validation of proof failed",
    issuerStateTransitions: [require("./data/issuer_state_transition.json")],
    mtfProofJson: require("./data/invalid_mtp_user_genesis.json"),
    errorMessage: "MTP Proof could not be verified",
  },

  {
    name: "User state is not genesis but latest",
    issuerStateTransitions: [require("./data/issuer_state_transition.json")],
    userStateTransition: require("./data/user_state_transition.json"),
    mtfProofJson: require("./data/valid_mtp_user_non_genesis.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is not expired (is not too old)",
    issuerStateTransitions: [
      require("./data/issuer_state_transition.json"),
      require("./data/issuer_next_state_transition.json"),
    ],
    userStateTransition: require("./data/user_state_transition.json"),
    mtfProofJson: require("./data/valid_mtp_user_non_genesis.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is expired (old enough)",
    issuerStateTransitions: [
      require("./data/issuer_state_transition.json"),
      require("./data/issuer_next_state_transition.json"),
    ],
    userStateTransition: require("./data/user_state_transition.json"),
    mtfProofJson: require("./data/valid_mtp_user_non_genesis.json"),
    setExpiration: 1,
    errorMessage: "Non-Revocation state of Issuer expired",
  },
];

describe("Atomic MTP Validator", function () {
  let state: any, mtp: any;

  beforeEach(async () => {
    const contracts = await deployValidatorContracts(
      "VerifierMTPWrapper",
      "CredentialAtomicQueryMTPValidator"
    );
    state = contracts.state;
    mtp = contracts.validator;
  });

  for (const test of testCases) {
    it(test.name, async () => {
      for (const issuerStateJson of test.issuerStateTransitions) {
        await publishState(state, issuerStateJson);
      }

      if (test.userStateTransition) {
        await publishState(state, test.userStateTransition);
      }

      const query = {
        schema: ethers.BigNumber.from(
          "210459579859058135404770043788028292398"
        ),
        slotIndex: 2,
        operator: 2,
        value: [20020101],
        circuitId: "credentialAtomicQueryMTP",
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.mtfProofJson);
      if (test.errorMessage) {
        if (test.setExpiration) {
          await mtp.setRevocationStateExpirationTime(test.setExpiration);
        }

        (
          expect(mtp.verify(inputs, pi_a, pi_b, pi_c, query)).to.be as any
        ).revertedWith(test.errorMessage);
      } else {
        const verified = await mtp.verify(inputs, pi_a, pi_b, pi_c, query);
        expect(verified).to.be.true;
      }
    });
  }
  it("Example ERC20 Verifier", async () => {
    const token: any = await deployERC20ZKPVerifierToken("zkpVerifer", "ZKPVR");
    await publishState(state, require("./data/user_state_transition.json"));
    await publishState(state, require("./data/issuer_state_transition.json"));

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(
      require("./data/valid_mtp_user_non_genesis_challenge_address.json")
    );

    const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    expect(token.transfer).not.to.be.undefined;
    expect(token.submitZKPResponse).not.to.be.undefined;

    // try transfer without given proof

    await expect(
      token.transfer("0x900942Fd967cf176D0c0A1302ee0722e1468f580", 1)
    ).to.be.revertedWith(
      "only identities who provided proof are allowed to receive tokens"
    );
    expect(await token.balanceOf(account)).to.equal(0);

    // must be no queries
    console.log("supported requests - zero");

    expect((await token.getSupportedRequests()).length).to.be.equal(0);

    // set transfer request id

    const ageQuery = {
      schema: ethers.BigNumber.from("210459579859058135404770043788028292398"),
      slotIndex: 2,
      operator: 2,
      value: [20020101],
      circuitId: "credentialAtomicQueryMTP",
    };

    const requestId = await token.TRANSFER_REQUEST_ID();
    expect(requestId).to.be.equal(1);

    await token.setZKPRequest(requestId, mtp.address, ageQuery);

    expect((await token.requestQueries(requestId)).schema).to.be.equal(
      ageQuery.schema
    ); // check that query is assigned
    expect((await token.getSupportedRequests()).length).to.be.equal(1);

    // submit response for non-existing request

    await expect(
      token.submitZKPResponse(2, inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("validator is not set for this request id");

    await token.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c);

    expect(await token.proofs(account, requestId)).to.be.true; // check proof is assigned

    // сheck that tokens were minted

    expect(await token.balanceOf(account)).to.equal(
      ethers.BigNumber.from("5000000000000000000")
    );

    // if proof is provided second time, address is not receiving airdrop tokens
    await expect(
      token.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("proof can not be submitted more than once'");

    await token.transfer(account, 1); // we send tokens to ourselves, but no error.
    expect(await token.balanceOf(account)).to.equal(
      ethers.BigNumber.from("5000000000000000000")
    );
  });
});
