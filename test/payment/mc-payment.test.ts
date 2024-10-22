import { ethers, upgrades } from "hardhat";
import { ERC20PermitToken, MCPayment, MCPayment__factory } from "../../typechain-types";
import { expect } from "chai";

describe("MC Payment Contract", () => {
  let payment: MCPayment;
  let issuer1Signer, owner, userSigner, userSigner2, userSigner3, domainData;
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
    userSigner2 = signers[6];
    userSigner3 = signers[7];
    owner = signers[0];

    const permitTokenContract = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = await permitTokenContract.deploy(1_000);
    await token.waitForDeployment();

    payment = (await upgrades.deployProxy(new MCPayment__factory(owner), [
      await owner.getAddress(),
      ownerPercentage,
      await token.getAddress(),
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

    const issuer1BalanceAfterWithdraw = await payment.getBalance(issuer1Signer.address);
    expect(issuer1BalanceAfterWithdraw).to.be.eq(0);

    // owner withdraw
    const ownerBalanceInContract = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceInContract).to.be.eq(10);

    await expect(() => payment.connect(owner).ownerWithdraw()).to.changeEtherBalance(owner, 10);
    // owner balance should be 0
    const ownerBalanceAfterWithdraw = await payment.connect(owner).getOwnerBalance();
    expect(ownerBalanceAfterWithdraw).to.be.eq(0);

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

  it("ERC20 bulk Transfer payment:", async () => {
    const tokenContract = await ethers.getContractFactory("ERC20Token", owner);
    const token = await tokenContract.deploy(1_000);
    await token.waitForDeployment();
    // transfer some tokens to user
    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    await token.connect(owner).transfer(await userSigner2.getAddress(), 100);
    await token.connect(owner).transfer(await userSigner3.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);
    expect(await token.balanceOf(await userSigner2.getAddress())).to.be.eq(100);
    expect(await token.balanceOf(await userSigner3.getAddress())).to.be.eq(100);

    const tokenAddress = await token.getAddress();
    const userPayments = [
      {
        tokenAddress,
        amount: 10,
        sender: userSigner,
        nonce: 1,
      },
      {
        tokenAddress,
        amount: 20,
        sender: userSigner2,
        nonce: 2,
      },
      {
        tokenAddress,
        amount: 30,
        sender: userSigner3,
        nonce: 3,
      },
    ];
    // users `approve` the payment contract to spend their tokens
    for (const userPayment of userPayments) {
      await token
        .connect(userPayment.sender)
        .approve(await payment.getAddress(), userPayment.amount);
    }

    const paymentsData = userPayments.map((payment) => ({
      recipient: issuer1Signer.address,
      amount: payment.amount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: payment.nonce,
      metadata: packMetadata(payment.tokenAddress, payment.sender.address),
    }));

    const signatures = await Promise.all(
      paymentsData.map((paymentData) =>
        issuer1Signer.signTypedData(domainData, types, paymentData),
      ),
    );

    // issuer collect all payments
    const verifyGas = await payment
      .connect(issuer1Signer)
      .erc20BulkTransferFrom.estimateGas(paymentsData, signatures);
    console.log("ERC-20 Bulk Transfer From Verification Gas: " + verifyGas);

    await payment.connect(issuer1Signer).erc20BulkTransferFrom(paymentsData, signatures);

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(90);
    expect(await token.balanceOf(await userSigner2.getAddress())).to.be.eq(80);
    expect(await token.balanceOf(await userSigner3.getAddress())).to.be.eq(70);

    // 60 - 10% owner fee = 54
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(54);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(6);
  });

  it.only("ERC20Permit transfer payment:", async () => {
    // transfer some tokens to user
    const permitTokenContract = await ethers.getContractFactory("ERC20PermitToken", owner);
    const token = (await permitTokenContract.attach(
      await payment.getUsdcTokenAddress(),
    )) as ERC20PermitToken;

    await token.connect(owner).transfer(await userSigner.getAddress(), 100);
    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(100);

    const paymentAmount = 10;

    const permitSig = await getPermitSignature(
      userSigner,
      await token.getAddress(),
      await payment.getAddress(),
      paymentAmount,
      0,
      Math.round(new Date().getTime() / 1000) + 60 * 60,
    );

    const paymentData = {
      recipient: issuer1Signer.address,
      amount: paymentAmount,
      expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
      nonce: 35,
      metadata: "0x",
    };

    const issuerSignature = issuer1Signer.signTypedData(domainData, types, paymentData);

    await payment
      .connect(userSigner)
      .tokenPermitAndTransferPayment(paymentData, issuerSignature, permitSig);
    console.log("payment done");

    expect(await token.balanceOf(await userSigner.getAddress())).to.be.eq(90);
    // 10 - 10% owner fee = 9
    expect(await token.balanceOf(await issuer1Signer.getAddress())).to.be.eq(9);
    expect(await token.balanceOf(await payment.getAddress())).to.be.eq(1);

    expect(await payment.isPaymentDone(issuer1Signer.address, 35)).to.be.true;
  });
});

function getPermitSignature(
  signer, // User who owns the tokens
  tokenAddress, // USDC contract address
  spender, // The contract address that will spend tokens
  value, // Amount of tokens to approve
  nonce, // Nonce (can be retrieved from USDC contract)
  deadline, // Timestamp when the permit expires
) {
  const domain = {
    name: "TEST", // USDC contract name
    version: "1", // 2 for USDC
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
    owner: signer.address,
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };

  // Sign the message
  return signer.signTypedData(domain, types, message);
}

function packMetadata(tokenAddress: string, sender: string): string {
  return new ethers.AbiCoder().encode(
    ["tuple(" + "address sender," + "address erc20TokenAddress" + ")"],
    [
      {
        sender,
        erc20TokenAddress: tokenAddress,
      },
    ],
  );
}
