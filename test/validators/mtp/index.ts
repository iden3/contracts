import { expect } from "chai";
import { ethers } from "hardhat";
import {
  deployERC20ZKPVerifierToken,
  deployValidatorContracts,
  prepareInputs,
  publishState,
} from "../../utils/deploy-utils";

const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/valid_mtp_user_genesis.json"),
  },
  {
    name: "Validation of proof failed",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/invalid_mtp_user_genesis.json"),
    errorMessage: "MTP Proof could not be verified",
  },
  {
    name: "User state is not genesis but latest",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
    ],
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is not expired (is not too old)",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    errorMessage: "",
  },
  {
    name: "The non-revocation issuer state is expired (old enough)",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    setExpiration: 1,
    errorMessage: "Non-Revocation state of Issuer expired",
  },
];

describe("Atomic MTP Validator", function () {
  let state: any, mtpValidator: any;

  beforeEach(async () => {
    const contracts = await deployValidatorContracts(
      "VerifierMTPWrapper",
      "CredentialAtomicQueryMTPValidator"
    );
    state = contracts.state;
    mtpValidator = contracts.validator;
  });

  for (const test of testCases) {
    it(test.name, async () => {
      for (const json of test.stateTransitions) {
        await publishState(state, json);
      }

      const query = {
        schema: ethers.BigNumber.from("180410020913331409885634153623124536270"),
        claimPathKey: ethers.BigNumber.from(
          "8566939875427719562376598811066985304309117528846759529734201066483458512800"
        ),
        operator: ethers.BigNumber.from(1),
        value: [
          "1420070400000000000",
          ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
        ],
        queryHash: ethers.BigNumber.from(
          "1496222740463292783938163206931059379817846775593932664024082849882751356658"
        ),
        circuitId: "credentialAtomicQueryMTPV2OnChain",
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      if (test.errorMessage) {
        if (test.setExpiration) {
          await mtpValidator.setRevocationStateExpirationTime(test.setExpiration);
        }

        (
          expect(mtpValidator.verify(inputs, pi_a, pi_b, pi_c, query.queryHash)).to.be as any
        ).revertedWith(test.errorMessage);
      } else {
        const verified = await mtpValidator.verify(inputs, pi_a, pi_b, pi_c, query.queryHash);
        expect(verified).to.be.true;
      }
    });
  }

  async function erc20VerifierFlow(callBack: (q, t, r) => Promise<void>): Promise<void> {
    const token: any = await deployERC20ZKPVerifierToken("zkpVerifer", "ZKPVR");
    await publishState(state, require("../common-data/user_state_transition.json"));
    await publishState(state, require("../common-data/issuer_genesis_state.json"));

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(
      require("./data/valid_mtp_user_non_genesis_challenge_address.json")
    );

    const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    expect(token.transfer).not.to.be.undefined;
    expect(token.submitZKPResponse).not.to.be.undefined;

    // try transfer without given proof

    await expect(
      token.transfer("0x900942Fd967cf176D0c0A1302ee0722e1468f580", 1)
    ).to.be.revertedWith("only identities who provided proof are allowed to receive tokens");
    expect(await token.balanceOf(account)).to.equal(0);

    // must be no queries
    console.log("supported requests - zero");

    expect((await token.getSupportedRequests()).length).to.be.equal(0);

    // set transfer request id

    const query = {
      schema: ethers.BigNumber.from("180410020913331409885634153623124536270"),
      claimPathKey: ethers.BigNumber.from(
        "8566939875427719562376598811066985304309117528846759529734201066483458512800"
      ),
      operator: ethers.BigNumber.from(1),
      value: [
        "1420070400000000000",
        ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
      ],
      circuitId: "credentialAtomicQueryMTPV2OnChain",
    };

    const requestId = await token.TRANSFER_REQUEST_ID();
    expect(requestId).to.be.equal(1);

    await callBack(query, token, requestId);

    expect((await token.requestQueries(requestId)).queryHash.toString()).to.be.equal(
      "1496222740463292783938163206931059379817846775593932664024082849882751356658"
    ); // check that query is assigned
    expect((await token.getSupportedRequests()).length).to.be.equal(1);

    // submit response for non-existing request

    await expect(token.submitZKPResponse(2, inputs, pi_a, pi_b, pi_c)).to.be.revertedWith(
      "validator is not set for this request id"
    );

    await token.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c);

    expect(await token.proofs(account, requestId)).to.be.true; // check proof is assigned

    // сheck that tokens were minted

    expect(await token.balanceOf(account)).to.equal(ethers.BigNumber.from("5000000000000000000"));

    // if proof is provided second time, address is not receiving airdrop tokens
    await expect(token.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c)).to.be.revertedWith(
      "proof can not be submitted more than once'"
    );

    await token.transfer(account, 1); // we send tokens to ourselves, but no error.
    expect(await token.balanceOf(account)).to.equal(ethers.BigNumber.from("5000000000000000000"));
  }

  it("Example ERC20 Verifier: set zkp request", async () => {
    await erc20VerifierFlow(async (query, token, requestId) => {
      await token.setZKPRequest(
        requestId,
        mtpValidator.address,
        query.schema,
        query.claimPathKey,
        query.operator,
        query.value
      );
    });
  });

  it("Example ERC20 Verifier: set zkp request raw", async () => {
    await erc20VerifierFlow(async (query, token, requestId) => {
      await token.setZKPRequestRaw(
        requestId,
        mtpValidator.address,
        query.schema,
        query.claimPathKey,
        query.operator,
        query.value,
        ethers.BigNumber.from(
          "1496222740463292783938163206931059379817846775593932664024082849882751356658"
        )
      );
    });
  });
});
