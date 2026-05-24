import { network } from "hardhat";
import { expect } from "chai";
import { type Signer } from "ethers";
import MCPaymentModule from "../../ignition/modules/deployEverythingBasicStrategy/mcPayment";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("MC Payment Contract", () => {
  let payment;
  let issuer1Signer, recipient, owner, userSigner: Signer, domainData;
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

  const erc20types = {
    Iden3PaymentRailsERC20RequestV1: [
      { name: "tokenAddress", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expirationDate", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "metadata", type: "bytes" },
    ],
  };

  async function deployContractsFixture() {
    const signers = await ethers.getSigners();
    issuer1Signer = signers[1];
    userSigner = signers[5];
    owner = signers[0];
    recipient = signers[6];

    const parameters: any = {
      MCPaymentProxyModule: {
        ownerPercentage: ownerPercentage,
      },
    };

    const { MCPayment } = await ignition.deploy(MCPaymentModule, {
      parameters: parameters,
    });

    payment = MCPayment;
  }

  beforeEach(async () => {
    await networkHelpers.loadFixture(deployContractsFixture);

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
    const signer = await payment
      .connect(userSigner)
      .recoverIden3PaymentRailsRequestV1Signature(paymentData, signature);
    expect(signer).to.be.eq(issuer1Signer.address);
  });

  it("Check payment", async () => {
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
        value: 100,
      }),
    ).to.changeEtherBalances(ethers, [userSigner, payment], [-100, 100]);

    const isPaymentDone = await payment.isPaymentDone(issuer1Signer.address, 25);
    expect(isPaymentDone).to.be.true;

    // issuer withdraw
    const issuer1BalanceInContract = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceInContract).to.be.eq(90);

    await expect(() => payment.connect(issuer1Signer).issuerWithdraw()).to.changeEtherBalance(
      ethers,
      issuer1Signer,
      90,
    );

    // second issuer withdraw
    await expect(payment.connect(issuer1Signer).issuerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );

    const issuer1BalanceAfterWithdraw = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceAfterWithdraw).to.be.eq(0);

    // owner withdraw
    const ownerBalanceInContract = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceInContract).to.be.eq(10);

    await expect(() => payment.connect(owner).ownerWithdraw()).to.changeEtherBalance(
      ethers,
      owner,
      10,
    );
    // owner balance should be 0
    const ownerBalanceAfterWithdraw = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceAfterWithdraw).to.be.eq(0);

    // second owner withdraw
    await expect(payment.connect(owner).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );
  });

  it("Check payment with different issuer owner percentage", async () => {
    const paymentData = {
      recipient: issuer1Signer.address,
      amount: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 25,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);

    await payment.connect(owner).updateIssuerOwnerPercentage(issuer1Signer.address, 20);

    await expect(
      payment.connect(userSigner).pay(paymentData, signature, {
        value: 100,
      }),
    ).to.changeEtherBalances(ethers, [userSigner, payment], [-100, 100]);

    const isPaymentDone = await payment.isPaymentDone(issuer1Signer.address, 25);
    expect(isPaymentDone).to.be.true;

    // issuer withdraw
    const issuer1BalanceInContract = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceInContract).to.be.eq(80);

    await expect(() => payment.connect(issuer1Signer).issuerWithdraw()).to.changeEtherBalance(
      ethers,
      issuer1Signer,
      80,
    );

    // second issuer withdraw
    await expect(payment.connect(issuer1Signer).issuerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );

    const issuer1BalanceAfterWithdraw = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceAfterWithdraw).to.be.eq(0);

    // owner withdraw
    const ownerBalanceInContract = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceInContract).to.be.eq(20);

    await expect(() => payment.connect(owner).ownerWithdraw()).to.changeEtherBalance(
      ethers,
      owner,
      20,
    );
    // owner balance should be 0
    const ownerBalanceAfterWithdraw = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceAfterWithdraw).to.be.eq(0);

    // second owner withdraw
    await expect(payment.connect(owner).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );
  });

  it("Check payment with WITHDRAWER_ROLE account", async () => {
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
        value: 100,
      }),
    ).to.changeEtherBalances([userSigner, payment], [-100, 100]);

    const isPaymentDone = await payment.isPaymentDone(issuer1Signer.address, 25);
    expect(isPaymentDone).to.be.true;

    // issuer withdraw
    const issuer1BalanceInContract = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceInContract).to.be.eq(90);

    await expect(payment.connect(issuer1Signer).issuerWithdraw()).to.changeEtherBalance(
      issuer1Signer,
      90,
    );

    // second issuer withdraw
    await expect(payment.connect(issuer1Signer).issuerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );

    const issuer1BalanceAfterWithdraw = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceAfterWithdraw).to.be.eq(0);

    // owner withdraw
    const ownerBalanceInContract = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceInContract).to.be.eq(10);

    await expect(payment.connect(userSigner).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "AccessControlUnauthorizedAccount",
    );

    // grant admin role to owner
    await payment.connect(owner).setAdminRole(owner.address);
    // grant WITHDRAWER_ROLE to userSigner
    await payment
      .connect(owner)
      .grantRole(await payment.WITHDRAWER_ROLE(), await userSigner.getAddress());

    // now userSigner can withdraw owner balance
    await expect(payment.connect(userSigner).ownerWithdraw()).to.changeEtherBalance(userSigner, 10);
    // owner balance should be 0
    const ownerBalanceAfterWithdraw = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceAfterWithdraw).to.be.eq(0);

    // second owner withdraw
    await expect(payment.connect(userSigner).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );
    await expect(payment.connect(owner).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "WithdrawErrorNoBalance",
    );
  });

  it("Calling setAdminRole by owner:", async () => {
    expect(await payment.hasRole(await payment.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
    await payment.connect(owner).setAdminRole(owner.address);
    expect(await payment.hasRole(await payment.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    await payment.connect(owner).revokeRole(await payment.DEFAULT_ADMIN_ROLE(), owner.address);
    expect(await payment.hasRole(await payment.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
  });

  it("Calling setAdminRole by non-owner:", async () => {
    await expect(
      payment.connect(userSigner).setAdminRole(owner.address),
    ).to.be.revertedWithCustomError(payment, "OwnableUnauthorizedAccount");
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

  it("Update issuer owner percentage:", async () => {
    expect(await payment.getIssuerOwnerPercentage(issuer1Signer.address)).to.be.eq(10);
    await payment.connect(owner).updateIssuerOwnerPercentage(issuer1Signer.address, 20);
    expect(await payment.getIssuerOwnerPercentage(issuer1Signer.address)).to.be.eq(20);

    expect(await payment.getIssuerOwnerPercentage(recipient.address)).to.be.eq(10);

    await expect(
      payment.connect(owner).updateIssuerOwnerPercentage(issuer1Signer.address, 110),
    ).to.be.revertedWithCustomError(payment, "InvalidOwnerPercentage");

    await expect(
      payment.connect(issuer1Signer).updateIssuerOwnerPercentage(issuer1Signer.address, 0),
    ).to.be.revertedWithCustomError(payment, "OwnableUnauthorizedAccount");
  });

  it("Owner withdraw not owner or WITHDRAWER_ROLE account:", async () => {
    await expect(payment.connect(issuer1Signer).ownerWithdraw()).to.be.revertedWithCustomError(
      payment,
      "AccessControlUnauthorizedAccount",
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
      expirationDate: Math.round(new Date().getTime() / 1000) - 60 * 60, // - 1 hour
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

  it("ERC-20 payment:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    const erc20PaymentGas = await payment
      .connect(userSigner)
      .payERC20.estimateGas(paymentData, signature);
    console.log("ERC-20 Payment Gas: " + erc20PaymentGas);

    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.changeTokenBalances(ethers, token, [userSigner, issuer1Signer, payment], [-10, 9, 1]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
    // owner ERC-20 withdraw
    const tokenAddress = await token.getAddress();
    const ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
    expect(ownerBalance).to.be.eq(1);
    await expect(payment.connect(owner).ownerERC20Withdraw(tokenAddress)).to.changeTokenBalances(
      ethers,
      token,
      [owner, payment],
      [1, -1],
    );
    expect(await payment.getOwnerERC20Balance(tokenAddress)).to.be.eq(0);
  });

  it("ERC-20 payment with withdrawer role:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    const erc20PaymentGas = await payment
      .connect(userSigner)
      .payERC20.estimateGas(paymentData, signature);
    console.log("ERC-20 Payment Gas: " + erc20PaymentGas);

    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.changeTokenBalances(token, [userSigner, issuer1Signer, payment], [-10, 9, 1]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
    // owner ERC-20 withdraw
    const tokenAddress = await token.getAddress();
    const ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
    expect(ownerBalance).to.be.eq(1);

    await expect(
      payment.connect(userSigner).ownerERC20Withdraw(tokenAddress),
    ).to.be.revertedWithCustomError(payment, "AccessControlUnauthorizedAccount");

    // grant admin role to owner
    await payment.connect(owner).setAdminRole(owner.address);
    // grant WITHDRAWER_ROLE to userSigner
    await payment
      .connect(owner)
      .grantRole(await payment.WITHDRAWER_ROLE(), await userSigner.getAddress());

    await expect(
      payment.connect(userSigner).ownerERC20Withdraw(tokenAddress),
    ).to.changeTokenBalances(token, [userSigner, payment], [1, -1]);

    // second owner or withdrawer withdraw
    await expect(
      payment.connect(userSigner).ownerERC20Withdraw(tokenAddress),
    ).to.be.revertedWithCustomError(payment, "WithdrawErrorNoBalance");

    await expect(
      payment.connect(owner).ownerERC20Withdraw(tokenAddress),
    ).to.be.revertedWithCustomError(payment, "WithdrawErrorNoBalance");
    expect(await payment.getOwnerERC20Balance(tokenAddress)).to.be.eq(0);
  });

  it("ERC-20 payment with different issuer owner percentage:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    await payment.connect(owner).updateIssuerOwnerPercentage(issuer1Signer.address, 20);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    const erc20PaymentGas = await payment
      .connect(userSigner)
      .payERC20.estimateGas(paymentData, signature);
    console.log("ERC-20 Payment Gas: " + erc20PaymentGas);

    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.changeTokenBalances(ethers, token, [userSigner, issuer1Signer, payment], [-10, 8, 2]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
    // owner ERC-20 withdraw
    const tokenAddress = await token.getAddress();
    const ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
    expect(ownerBalance).to.be.eq(2);
    await expect(payment.connect(owner).ownerERC20Withdraw(tokenAddress)).to.changeTokenBalances(
      ethers,
      token,
      [owner, payment],
      [2, -2],
    );
    expect(await payment.getOwnerERC20Balance(tokenAddress)).to.be.eq(0);
  });

  it("ERC-20 payment with different issuer owner percentage 100%:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    await payment.connect(owner).updateIssuerOwnerPercentage(issuer1Signer.address, 100);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    const erc20PaymentGas = await payment
      .connect(userSigner)
      .payERC20.estimateGas(paymentData, signature);
    console.log("ERC-20 Payment Gas: " + erc20PaymentGas);

    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.changeTokenBalances(ethers, token, [userSigner, issuer1Signer, payment], [-10, 0, 10]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
    // owner ERC-20 withdraw
    const tokenAddress = await token.getAddress();
    const ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
    expect(ownerBalance).to.be.eq(10);
    await expect(payment.connect(owner).ownerERC20Withdraw(tokenAddress)).to.changeTokenBalances(
      ethers,
      token,
      [owner, payment],
      [10, -10],
    );
    expect(await payment.getOwnerERC20Balance(tokenAddress)).to.be.eq(0);
  });

  it("ERC-20 payment - expired:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) - 60 * 60, // - 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);

    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "PaymentError");
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.false;
  });

  it("ERC-20 payment - invalid signature", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    let signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    // break signature
    signature = signature.slice(0, -1).concat("0");
    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "InvalidSignature");

    // no changes in balance and payment status not done
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(0);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(0);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.false;
  });

  it("ERC-20 payment - paymend already done", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await payment.connect(userSigner).payERC20(paymentData, signature);
    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "PaymentError");

    // no changes in balance and payment status not done
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(90);
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(9);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(1);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
  });

  it("ERC-20 payment - call erc20Payment without approval", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await expect(
      payment.connect(userSigner).payERC20(paymentData, signature),
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(0);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(0);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.false;
  });

  it("ERC-20 Permit (EIP-2612) payment:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    const eip2612PaymentGas = await payment
      .connect(userSigner)
      .payERC20Permit.estimateGas(permitSignature, paymentData, signature);
    console.log("EIP-2612 Payment Gas: " + eip2612PaymentGas);

    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.changeTokenBalances(ethers, token, [userSigner, issuer1Signer, payment], [-10, 9, 1]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;

    // owner ERC-20 withdraw
    const tokenAddress = await token.getAddress();
    const ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
    expect(ownerBalance).to.be.eq(1);
    await expect(payment.connect(owner).ownerERC20Withdraw(tokenAddress)).to.changeTokenBalances(
      ethers,
      token,
      [owner, payment],
      [1, -1],
    );
  });

  it("ERC-20 Permit (EIP-2612) payment with different issuer owner percentage:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    await payment.connect(owner).updateIssuerOwnerPercentage(issuer1Signer.address, 20);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    const eip2612PaymentGas = await payment
      .connect(userSigner)
      .payERC20Permit.estimateGas(permitSignature, paymentData, signature);
    console.log("EIP-2612 Payment Gas: " + eip2612PaymentGas);

    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.changeTokenBalances(ethers, token, [userSigner, issuer1Signer, payment], [-10, 8, 2]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;

    // owner ERC-20 withdraw
    const tokenAddress = await token.getAddress();
    const ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
    expect(ownerBalance).to.be.eq(2);
    await expect(payment.connect(owner).ownerERC20Withdraw(tokenAddress)).to.changeTokenBalances(
      ethers,
      token,
      [owner, payment],
      [2, -2],
    );
  });

  it("ERC-20 Permit (EIP-2612) payment - expired:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) - 60 * 60, // - 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "PaymentError");
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.false;
  });

  it("ERC-20 Permit (EIP-2612) payment - DOS via frontrun:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );
    const { v, r, s } = ethers.Signature.from(permitSignature);
    const expiration = Math.round(new Date().getTime() / 1000) + 60 * 60; // 1 hour
    // emulate front-run transaction to use the nonce
    const frontRunTx = await token
      .connect(userSigner)
      .permit(
        await userSigner.getAddress(),
        await payment.getAddress(),
        paymentAmount,
        expiration,
        v,
        r,
        s,
      );
    await frontRunTx.wait();
    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: expiration,
      nonce: 35,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.changeTokenBalances(ethers, token, [userSigner, issuer1Signer, payment], [-10, 9, 1]);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
  });

  it("ERC-20 Permit (EIP-2612) payment - invalid permit signature length:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    let permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    permitSignature += "00"; // add 1 byte to the signature
    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);

    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "ECDSAInvalidSignatureLength");

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(0);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(0);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.false;
  });

  it("ERC-20 Permit (EIP-2612) payment - invalid signature:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    let signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    signature += "00"; // add 1 byte to the signature

    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "InvalidSignature");

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(0);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(0);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.false;
  });

  it("ERC-20 Permit (EIP-2612) payment - payment already done:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature);
    await expect(
      payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature),
    ).to.be.revertedWithCustomError(payment, "PaymentError");

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(90);
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(9);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(1);
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
  });

  it("Check payment - different signer and recipient:", async () => {
    const paymentData = {
      recipient: recipient.address,
      amount: 100,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60,
      nonce: 25,
      metadata: "0x",
    };
    const signature = await issuer1Signer.signTypedData(domainData, types, paymentData);

    await payment.connect(userSigner).pay(paymentData, signature, {
      value: 100,
    });

    const isPaymentDoneRecipient = await payment.isPaymentDone(recipient.address, 25);
    expect(isPaymentDoneRecipient).to.be.false;

    const isPaymentDoneSigner = await payment.isPaymentDone(issuer1Signer.address, 25);
    expect(isPaymentDoneSigner).to.be.true;

    // withdraw
    const recipientBalanceInContract = await payment.getBalance(recipient.address);
    expect(recipientBalanceInContract).to.be.eq(90);

    await expect(() => payment.connect(recipient).issuerWithdraw()).to.changeEtherBalance(
      ethers,
      recipient,
      90,
    );

    const recipinetBalanceAfterWithdraw = await payment.getBalance(recipient.address);
    expect(recipinetBalanceAfterWithdraw).to.be.eq(0);
  });

  it("ERC-20 payment - different signer and recipient:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    await token.connect(userSigner).approve(await payment.getAddress(), 10);

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: recipient.address,
      amount: 10,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60,
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await payment.connect(userSigner).payERC20(paymentData, signature);

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(90);
    // 10 - 10% owner fee = 9
    expect(await token.balanceOf(await recipient.getAddress())).to.be.eq(9);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(1);

    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
    expect(await payment.isPaymentDone(recipient.address, 35)).to.be.false;
  });

  it("ERC-20 Permit (EIP-2612) payment - different signer and recipient:", async () => {
    const tokenFactory = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await tokenFactory.deploy(1_000);
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10n;
    const permitSignature = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0n,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    const paymentData = {
      tokenAddress: await token.getAddress(),
      recipient: recipient.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60,
      nonce: 35,
      metadata: "0x",
    };

    const signature = await issuer1Signer.signTypedData(domainData, erc20types, paymentData);
    await payment.connect(userSigner).payERC20Permit(permitSignature, paymentData, signature);

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(90);
    // 10 - 10% owner fee = 9
    expect(await token.balanceOf(await recipient.getAddress())).to.be.eq(9);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(1);

    expect(await payment.isPaymentDone(recipient.address, 35)).to.be.false;
    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
  });
});

async function getPermitSignature(
  signer: Signer, // User who owns the tokens
  tokenAddress: string, // EIP-2612 contract address
  spender: string, // The contract address that will spend tokens
  value: bigint, // Amount of tokens to approve
  nonce: bigint, // Nonce (can be retrieved from EIP-2612 contract)
  deadline: number, // Timestamp when the permit expires
) {
  const domain = {
    name: "TEST",
    version: "1",
    chainId: 31337,
    verifyingContract: tokenAddress,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    owner: await signer.getAddress(),
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };

  return signer.signTypedData(domain, types, message);
}
