import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { deployERC721ReputationConceptVerifier, prepareInputs } from "../../utils/deploy-utils";

describe("Request Concept Verifier", function () {
  let rcValidator: any;

  beforeEach(async () => {
    const VerifierReputationConcept = await ethers.getContractFactory("VerifierReputationConceptWrapper");
    const verifierReputationConcept = await VerifierReputationConcept.deploy();
    await verifierReputationConcept.deployed();

    const ReputationConceptValidator = await ethers.getContractFactory(
      "ReputationConceptValidator"
    );
    rcValidator = await ReputationConceptValidator.deploy(
      verifierReputationConcept.address
    );
    await rcValidator.deployed();
  });

  it("ERC721 Reputation Concept: Submit ZK proof and issue token ", async () => {
    const [user, issuer] = await ethers.getSigners();

    // deploy ERC721 Reputation Concept
    const rcVerifier = await deployERC721ReputationConceptVerifier("Reputation Concept", "RC");

    // set ReputationConceptValidator for ERC721 Reputation Concept
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(require("./data/inputs_and_proof.json"));

    const requestId = 1;
    const operator = inputs[2];
    const queryValue = [inputs[3], inputs[4], inputs[5], inputs[6]];
    const fieldNotExists = !!inputs[7];

    //root, credentialSubject, operator, queryValue, fieldNotExists
    await rcVerifier.setZKPRequest(
      requestId,
      {
        validator: rcValidator.address,
        issuer: issuer.address,
        operator,
        queryValue,
        fieldNotExists
      }
    );

    // submit ZK proof and issue NFT
    const root = BigNumber.from(inputs[0]);

    // sign root on behalf of issuer
    const rootArrToSign = Buffer.from(root.toHexString().slice(2), "hex");
    const signature = await issuer.signMessage(rootArrToSign);
    // 0x6bfa5b477fdd00f2e77c41fe661e4935cd6fbc2d98d3745006a58aa9116091fc48976e504f9aa84a32d63b7455e0bd262294169a5f4d209d6d715d7c98a65f521c

    const sigR = BigNumber.from(signature.slice(0, 66));
    const sigS = BigNumber.from("0x" + signature.slice(66, 130));
    const sigV = BigNumber.from("0x" + signature.slice(130, 132));

    await rcVerifier.submitZKPResponse(
      requestId,
      inputs,
      pi_a,
      pi_b,
      pi_c,
      sigV,
      sigR,
      sigS,
    );

    // // check if NFT is issued
    expect(await rcVerifier.balanceOf(user.address)).to.equal(1);
  });
});
