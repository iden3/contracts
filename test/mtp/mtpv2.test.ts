import { expect } from "chai";
import { ethers } from "hardhat";
import {
  deployERC20ZKPVerifierToken,
  deployPoseidonExt,
  deployValidatorContracts,
  prepareInputs,
  publishState,
} from "../deploy-utils";

const testCases: any[] = [
  {
    name: "Validate Genesis User State/Issuer Claim IdenState is in Chain/Revocation State is in Chain",
    issuerStateTransitions: [require("./datav2/issuer_state_transition.json")],
    mtfProofJson: require("./datav2/valid_mtp_user_genesis.json"),
  },
  {
    name: "Validation of proof failed",
    issuerStateTransitions: [require("./datav2/issuer_state_transition.json")],
    mtfProofJson: require("./datav2/invalid_mtp_user_genesis.json"),
    errorMessage: "MTP Proof could not be verified",
  },

  {
    name: "User state is not genesis but latest",
    issuerStateTransitions: [require("./datav2/issuer_state_transition.json")],
    userStateTransition: require("./datav2/user_state_transition.json"),
    mtfProofJson: require("./datav2/valid_mtp_user_non_genesis.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is not expired (is not too old)",
    issuerStateTransitions: [
      require("./datav2/issuer_state_transition.json"),
      require("./datav2/issuer_next_state_transition.json"),
    ],
    userStateTransition: require("./datav2/user_state_transition.json"),
    mtfProofJson: require("./datav2/valid_mtp_user_non_genesis.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is expired (old enough)",
    issuerStateTransitions: [
      require("./datav2/issuer_state_transition.json"),
      require("./datav2/issuer_next_state_transition.json"),
    ],
    userStateTransition: require("./datav2/user_state_transition.json"),
    mtfProofJson: require("./datav2/valid_mtp_user_non_genesis.json"),
    setExpiration: 1,
    errorMessage: "Non-Revocation state of Issuer expired",
  },
];

describe.only("Atomic MTP Validator V2", function () {
  let state: any, mtp: any;

  beforeEach(async () => {
    const contracts = await deployValidatorContracts(
      "VerifierMTPWrapperV2",
      "CredentialAtomicQueryMTPValidatorV2"
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
        value: [20020101, new Array(63).fill(0)],
        valueHash: ethers.BigNumber.from(
          "4044782888831183712183347620047737367287592968870057422868359686203789801751"
        ),
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
    await publishState(state, require("./datav2/user_state_transition.json"));
    await publishState(state, require("./datav2/issuer_state_transition.json"));

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(
      require("./datav2/valid_mtp_user_non_genesis_challenge_address.json")
    );

    const [owner] = await ethers.getSigners();
    const poseidon = await deployPoseidonExt(owner);
    await token.setPoseidonEx(poseidon.address);

    expect(token.transfer).not.to.be.undefined;
    expect(token.submitZKPResponse).not.to.be.undefined;

    // try transfer without given proof

    await expect(
      token.transfer("0x900942Fd967cf176D0c0A1302ee0722e1468f580", 1)
    ).to.be.revertedWith(
      "only identities who provided proof are allowed to receive tokens"
    );
    expect(await token.balanceOf(owner.address)).to.equal(0);

    // must be no queries
    console.log("supported requests - zero");

    expect((await token.getSupportedRequests()).length).to.be.equal(0);

    // set transfer request id

    const ageQuery = {
      schema: ethers.BigNumber.from("210459579859058135404770043788028292398"),
      slotIndex: 2,
      operator: 2,
      value: [20020101, ...new Array(63).fill(0)],
      valueHash: ethers.BigNumber.from(
        "4044782888831183712183347620047737367287592968870057422868359686203789801751"
      ),
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

    expect(await token.proofs(owner.address, requestId)).to.be.true; // check proof is assigned

    // сheck that tokens were minted

    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.BigNumber.from("5000000000000000000")
    );

    // if proof is provided second time, address is not receiving airdrop tokens
    await expect(
      token.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("proof can not be submitted more than once'");

    await token.transfer(owner.address, 1); // we send tokens to ourselves, but no error.
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.BigNumber.from("5000000000000000000")
    );
  });
});
