import { ethers, upgrades } from "hardhat";
import { MCPayment, MCPayment__factory } from "../../typechain-types";
import { Signer } from "ethers";
import { expect } from "chai";

describe("MC Payment Contract", () => {
  let payment: MCPayment;
  let issuer1Signer, owner, userSigner: Signer, domainData;
  const ownerPercentage = 10;
  const types = {
    Iden3PaymentRailsRequestV1: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expirationDate", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "metadata", type: "bytes" },
    ],
  };

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    issuer1Signer = signers[1];
    userSigner = signers[5];
    owner = signers[0];

    payment = (await upgrades.deployProxy(new MCPayment__factory(owner), [
      await owner.getAddress(),
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
      amount: 100,
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
      amount: 100,
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
    const issuer1BalanceInContract = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceInContract).to.be.eq(90);

    await expect(() => payment.connect(issuer1Signer).issuerWithdraw()).to.changeEtherBalance(
      issuer1Signer,
      90,
    );

    // second issuer withdraw
    await expect(payment.connect(issuer1Signer).issuerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawError",
    );

    const issuer1BalanceAfterWithdrow = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceAfterWithdrow).to.be.eq(0);

    // owner withdraw
    const ownerBalanceInContract = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceInContract).to.be.eq(10);

    await expect(() => payment.connect(owner).ownerWithdraw()).to.changeEtherBalance(owner, 10);
    // owner balance should be 0
    const ownerBalanceAfterWithdrow = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceAfterWithdrow).to.be.eq(0);

    // second owner withdraw
    await expect(payment.connect(owner).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawError",
    );
  });

  it("Update owner percentage:", async () => {
    expect(await payment.getOwnerPercentage()).to.be.eq(10);
    await payment.connect(owner).updateOwnerPercentage(20);
    expect(await payment.getOwnerPercentage()).to.be.eq(20);

    await expect(payment.connect(owner).updateOwnerPercentage(110)).to.be.revertedWithCustomError(
      payment,
      "InvalidOwnerPercentage",
    );

    await expect(
      payment.connect(issuer1Signer).updateOwnerPercentage(0),
    ).to.be.revertedWithCustomError(payment, "OwnableUnauthorizedAccount");
  });

  it("Owner withdraw not owner account:", async () => {
    await expect(payment.connect(issuer1Signer).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "OwnableUnauthorizedAccount",
    );
  });

  it("Invalid signature", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      amount: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 25,
      metadata: "0x",
    };
    let signature = await issuer1Signer.signTypedData(domainData, types, paymentData);
    // break signature
    signature = signature.slice(0, -1).concat("0");
    await expect(
      payment.connect(userSigner).pay(paymentData, signature, {
        value: 100,
      }),
    ).to.be.revertedWithCustomError(payment, "InvalidSignature");
  });

  it("Invalid payment value", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      amount: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 25,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);
    await expect(
      payment.connect(userSigner).pay(paymentData, signature, {
        value: 50,
      }),
    ).to.be.revertedWithCustomError(payment, "PaymentError");
  });

  it("Pay twice for the same nonce", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      amount: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 25,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);

    await payment.connect(userSigner).pay(paymentData, signature, {
      value: 100,
    });

    await expect(
      payment.connect(userSigner).pay(paymentData, signature, {
        value: 100,
      }),
    ).to.be.revertedWithCustomError(payment, "PaymentError");
  });

  it("Expired payment", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      amount: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) - 60 * 60, // 1 hour
      nonce: 25,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);
    await expect(
      payment.connect(userSigner).pay(paymentData, signature, {
        value: 100,
      }),
    ).to.be.revertedWithCustomError(payment, "PaymentError");
  });
});
