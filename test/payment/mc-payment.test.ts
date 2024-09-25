import { DID } from "@iden3/js-iden3-core";
import { ethers, upgrades } from "hardhat";
import { MCPayment, MCPayment__factory } from "../../typechain-types";
import { Signer } from "ethers";
import { expect } from "chai";

describe.only("VC Payment Contract", () => {
  let payment: MCPayment;
  const issuerId1 = DID.idFromDID(
    DID.parse("did:polygonid:polygon:amoy:2qQ68JkRcf3ymy9wtzKyY3Dajst9c6cHCDZyx7NrTz"),
  );
  let issuer1Signer, issuer2Signer, owner, userSigner: Signer, domainData;

  const types = {
    PaymentData: [
      { name: "issuerId", type: "uint256" },
      { name: "schemaHash", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "expirationDate", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  beforeEach(async () => {
    const ownerPercentage = 5;
    const signers = await ethers.getSigners();
    issuer1Signer = signers[1];
    issuer2Signer = signers[2];
    userSigner = signers[5];
    owner = signers[0];

    payment = (await upgrades.deployProxy(new MCPayment__factory(owner))) as unknown as MCPayment;
    await payment.waitForDeployment();
    await payment.setIssuer(issuerId1.bigInt(), issuer1Signer.address, ownerPercentage);

    domainData = {
      name: "MCPayment",
      version: "1.0.0",
      chainId: 31337,
      verifyingContract: await payment.getAddress(),
    };
  });

  it("Check signature verification:", async () => {
    const paymentData = {
      issuerId: issuerId1.bigInt(),
      schemaHash: 0,
      value: 100,
      expirationDate: 10000000,
      nonce: 25,
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);
    console.log("signer address", issuer1Signer.address);
    await payment.connect(userSigner).verifySignature(paymentData, signature);
  });

  it.only("Check payment:", async () => {
    const paymentData = {
      issuerId: issuerId1.bigInt(),
      schemaHash: 0,
      value: 100,
      expirationDate: 10000000,
      nonce: 25,
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);
    console.log("signer address", issuer1Signer.address);

    await payment.connect(userSigner).pay(paymentData, signature, {
      value: 100,
    });

    const isPaymentDone = await payment.isPaymentDone(issuerId1.bigInt(), 25);
    expect(isPaymentDone).to.be.true;
  });
});
