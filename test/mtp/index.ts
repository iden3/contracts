import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { expect } from "chai";
import { ethers } from "hardhat";

import {deployToken, deployContracts, deployERC20ZKPToken} from "./deploy";
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

describe("Atomic MTP Validator", function () {
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

      const query = {schema:ethers.BigNumber.from("106590880073303418818490710639556704462"), slotIndex: 2, operator: 5, value: [840], circuitId : "credentialAmoticQueryMTP"};

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.mtfProofJson);
      if (test.errorMessage) {
        if (test.setExpiration) {
          await mtp.setRevocationStateExpirationTime(test.setExpiration);
        }

        (
          expect(mtp.verify(inputs, pi_a, pi_b, pi_c, query)).to.be as any
        ).revertedWith(test.errorMessage);
      } else {
        const verified = await mtp.verify(inputs, pi_a, pi_b, pi_c,query);
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
    await token.mintWithProof(inputs, pi_a, pi_b, pi_c);
    expect(await token.balanceOf(account)).to.equal(5);

    await expect(
      token.mintWithProof(inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("identity can't mint token more than once");
    expect(await token.balanceOf(account)).to.equal(5);

    expect(token.mint).to.be.undefined;
    expect(token.transfer).not.to.be.undefined;

    const [, addr1] = await ethers.getSigners();
    await token.transfer(addr1.address, 2);

    expect(await token.balanceOf(account)).to.equal(3);
  });

  it("Example ZKP token", async () => {
    const token: any = await deployERC20ZKPToken(mtp.address);
    await publishState(state, require("./data/user_state_transition.json"));

    await publishState(state, require("./data/stateTransitionAgeClaim.json"));

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(
        require("./data/mpt_token_example.json")
    );

    const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    expect(token.transferWithProof).not.to.be.undefined;
    expect(token.mintWithProof).not.to.be.undefined;

    await token.mintWithProof(inputs, pi_a, pi_b, pi_c);
    expect(await token.balanceOf(account)).to.equal(5);


    await expect(
        token.mintWithProof(inputs, pi_a, pi_b, pi_c)
    ).to.be.revertedWith("identity can't mint token more than once");
    expect(await token.balanceOf(account)).to.equal(5);

    expect(token.mint).to.be.undefined;
    expect(token.transfer).not.to.be.undefined;


    const [, addr1] = await ethers.getSigners();
    await expect(
         token.transfer(addr1.address, 2)
    ).to.be.revertedWith("ERC20ZKP: only transfers with zkp are allowed.");



    // let's change input, so we try to send token to another address, (that we didn't prove)
    let newInputs =  [...inputs]
    newInputs[2] = "0" // it corresponds to 0x0000000000000000000000000000000000000000
    await expect(
        token.transferWithProof(newInputs, pi_a, pi_b, pi_c,2)
    ).to.be.revertedWith("'MTP is not valid");

    // but we can transfer token to ourselves, with current proof.

    await token.transferWithProof(inputs, pi_a, pi_b, pi_c,2)

    // balance of course, is not changed
    expect(await token.balanceOf(account)).to.equal(5);



    // TODO: add test to transfer token to another address with another mtp proof


  });

});
