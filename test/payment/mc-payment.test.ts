import { DID } from "@iden3/js-iden3-core";
import { ethers, upgrades } from "hardhat";
import { MCPayment, MCPayment__factory } from "../../typechain-types";
import { Signer } from "ethers";
import { expect } from "chai";

describe("VC Payment Contract", () => {
  let payment: MCPayment;
  const issuerId1 = DID.idFromDID(
    DID.parse("did:polygonid:polygon:amoy:2qQ68JkRcf3ymy9wtzKyY3Dajst9c6cHCDZyx7NrTz"),
  );
  let issuer1Signer, issuer2Signer, owner, userSigner: Signer, domainData;
  const ownerPercentage = 10;
  const types = {
    Iden3PaymentRailsRequestV1: [
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

    domainData = {
      name: "MCPayment",
      version: "1.0.0",
      chainId: 31337,
      verifyingContract: await payment.getAddress(),
    };
  });

  it("Check signature verification:", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      value: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60,
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

  it("Check payment:", async () => {
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

    // issuer withdraw
    const issuerBalanceBeforeWithdraw = await ethers.provider.getBalance(issuer1Signer.address);
    const issuer1BalanceInContract = await payment.connect(issuer1Signer).getMyBalance();
    expect(issuer1BalanceInContract).to.be.eq(90);
    const issuerWithdrawTx = await payment.connect(issuer1Signer).issuerWithdraw();
    // issuer 1 balance should be 0
    const issuer1BalanceAfterWithdrow = await payment.connect(issuer1Signer).getMyBalance();
    expect(issuer1BalanceAfterWithdrow).to.be.eq(0);

    const receipt = await issuerWithdrawTx.wait();
    const gasSpent = receipt!.gasUsed * receipt!.gasPrice;

    expect(await ethers.provider.getBalance(issuer1Signer.address)).to.be.eq(
      issuerBalanceBeforeWithdraw + issuer1BalanceInContract - gasSpent,
    );

    // owner withdraw
    const ownerBalanceBeforeWithdraw = await ethers.provider.getBalance(owner.address);
    const ownerBalanceInContract = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceInContract).to.be.eq(10);
    const ownerWithdrawTx = await payment.connect(owner).ownerWithdraw();
    // owner balance should be 0
    const ownerBalanceAfterWithdrow = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceAfterWithdrow).to.be.eq(0);

    const ownerReceipt = await ownerWithdrawTx.wait();
    const ownerGasSpent = ownerReceipt!.gasUsed * ownerReceipt!.gasPrice;

    expect(await ethers.provider.getBalance(owner.address)).to.be.eq(
      ownerBalanceBeforeWithdraw + ownerBalanceInContract - ownerGasSpent,
    );
  });
});
