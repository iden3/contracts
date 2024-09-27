import { DID } from "@iden3/js-iden3-core";
import { ethers, upgrades } from "hardhat";
import { MCPayment, MCPayment__factory } from "../../typechain-types";
import { Contract, Signer } from "ethers";
import { expect } from "chai";

describe.only("VC Payment Contract", () => {
  let payment: MCPayment;
  const issuerId1 = DID.idFromDID(
    DID.parse("did:polygonid:polygon:amoy:2qQ68JkRcf3ymy9wtzKyY3Dajst9c6cHCDZyx7NrTz"),
  );
  let issuer1Signer, issuer2Signer, owner, userSigner: Signer, domainData;
  const ownerPercentage = 10;
  const types = {
    PaymentData: [
      { name: "recipient", type: "address" },
      { name: "value", type: "uint256" },
      { name: "expirationDate", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "metadata", type: "bytes" },
    ],
  };

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    issuer1Signer = signers[1];
    issuer2Signer = signers[2];
    userSigner = signers[5];
    owner = signers[0];

    payment = (await upgrades.deployProxy(new MCPayment__factory(owner), [
      ownerPercentage,
    ])) as unknown as MCPayment;
    await payment.waitForDeployment();
    // await payment.setIssuer(issuerId1.bigInt(), issuer1Signer.address, ownerPercentage);

    domainData = {
      name: "MCPayment",
      version: "1.0.0",
      chainId: 31337,
      verifyingContract: await payment.getAddress(),
    };
  });

  it.only("Check signature verification:", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      value: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 22,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);
    const verifyGas = await payment
      .connect(userSigner)
      .verifySignature.estimateGas(paymentData, signature);
    console.log("Verification Gas: " + verifyGas);
    await payment.connect(userSigner).verifySignature(paymentData, signature);
  });

  it.only("Check payment:", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      value: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 25,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);

    const gas = await payment.connect(userSigner).pay.estimateGas(paymentData, signature, {
      value: 100,
    });
    console.log("Payment Gas: " + gas);

    await payment.connect(userSigner).pay(paymentData, signature, {
      value: 100,
    });

    const isPaymentDone = await payment.isPaymentDone(issuer1Signer.address, 25);
    expect(isPaymentDone).to.be.true;
  });
});

