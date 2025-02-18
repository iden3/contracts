import { Hex } from "@iden3/js-crypto";
import { DID, SchemaHash } from "@iden3/js-iden3-core";
import { ethers, upgrades } from "hardhat";
import { VCPayment, VCPayment__factory } from "../../typechain-types";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("VC Payment Contract", () => {
  let payment: VCPayment;
  const issuerId1 = DID.idFromDID(
    DID.parse("did:polygonid:polygon:amoy:2qQ68JkRcf3ymy9wtzKyY3Dajst9c6cHCDZyx7NrTz"),
  );
  const issuerId2 = DID.idFromDID(
    DID.parse("did:polygonid:polygon:amoy:2qZ1qniEoXvAPCqm7GwUSQWsRYFip124ddXU3fTg61"),
  );
  const schemaHash1 = new SchemaHash(Hex.decodeString("ce6bb12c96bfd1544c02c289c6b4b987"));
  const schemaHash2 = new SchemaHash(Hex.decodeString("ce6bb12c96bfd1544c02c289c6b4b988"));
  const schemaHash3 = new SchemaHash(Hex.decodeString("ce6bb12c96bfd1544c02c289c6b4b998"));

  let issuer1Signer, issuer2Signer, owner, userSigner: Signer;

  async function deployContractsFixture() {
    const ownerPercentage = 5;

    payment = (await upgrades.deployProxy(new VCPayment__factory(owner), [
      await owner.getAddress(),
    ])) as unknown as VCPayment;
    await payment.waitForDeployment();

    await payment.setPaymentValue(
      issuerId1.bigInt(),
      schemaHash1.bigInt(),
      10000,
      ownerPercentage,
      issuer1Signer.address,
    );
    await payment.setPaymentValue(
      issuerId1.bigInt(),
      schemaHash2.bigInt(),
      20000,
      ownerPercentage,
      issuer1Signer.address,
    );
    await payment.setPaymentValue(
      issuerId2.bigInt(),
      schemaHash3.bigInt(),
      30000,
      ownerPercentage,
      issuer2Signer.address,
    );
  }

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    issuer1Signer = signers[1];
    issuer2Signer = signers[2];
    userSigner = signers[5];
    owner = signers[0];

    await loadFixture(deployContractsFixture);
  });

  it("Should revert if payment value is already set", async () => {
    await expect(
      payment.setPaymentValue(
        issuerId1.bigInt(),
        schemaHash1.bigInt(),
        10000,
        5,
        issuer1Signer.address,
      ),
    )
      .to.be.revertedWithCustomError(payment, "PaymentValueAlreadySet")
      .withArgs(issuerId1.bigInt(), schemaHash1.bigInt());
  });

  it("Payment and withdrawal by issuer and owner:", async () => {
    const paymentFromUser = payment.connect(userSigner);

    // pay 4 times to issuer 1 in total 50000 (5% to owner) => issuerBalance = 47500
    await paymentFromUser.pay("payment-id-1", issuerId1.bigInt(), schemaHash1.bigInt(), {
      value: 10000,
    });

    await paymentFromUser.pay("payment-id-2", issuerId1.bigInt(), schemaHash1.bigInt(), {
      value: 10000,
    });

    await paymentFromUser.pay("payment-id-3", issuerId1.bigInt(), schemaHash1.bigInt(), {
      value: 10000,
    });

    await paymentFromUser.pay("payment-id-4", issuerId1.bigInt(), schemaHash2.bigInt(), {
      value: 20000,
    });

    // issuer 2, should not have affect on issuer 1 withdraw
    await paymentFromUser.pay("payment-id-1", issuerId2.bigInt(), schemaHash3.bigInt(), {
      value: 30000,
    });

    expect(await payment.getOwnerBalance()).to.be.eq(4000);
    expect(await payment.ownerWithdraw()).to.changeEtherBalance(owner, 4000);
    await expect(payment.ownerWithdraw())
      .to.be.revertedWithCustomError(payment, "NoBalanceToWithdraw")
      .withArgs(owner.address);

    const issuer1BalanceInContract = await payment.connect(issuer1Signer).getMyBalance();
    expect(issuer1BalanceInContract).to.be.eq(47500);
    const issuerWithdrawTx = await payment.connect(issuer1Signer).issuerWithdraw();
    // issuer 1 balance should be 0
    expect(await payment.connect(issuer1Signer).getMyBalance()).to.be.eq(0);

    await expect(issuerWithdrawTx)
      .to.emit(payment, "Withdraw")
      .withArgs(issuer1Signer.address, 47500);

    await expect(issuerWithdrawTx).to.changeEtherBalance(issuer1Signer, 47500);

    // issuer 2 balance should not change
    expect(await payment.connect(issuer2Signer).getMyBalance()).to.be.eq(28500);
    expect(await ethers.provider.getBalance(payment)).to.be.eq(80000 - 47500 - 4000);

    await expect(payment.connect(issuer1Signer).issuerWithdraw())
      .to.be.revertedWithCustomError(payment, "NoBalanceToWithdraw")
      .withArgs(issuer1Signer.address);
  });

  it("Update withdrawAddress", async () => {
    await payment.pay("payment-id-1", issuerId1.bigInt(), schemaHash1.bigInt(), {
      value: 10000,
    });

    expect(await payment.connect(issuer1Signer).getMyBalance()).to.be.eq(9500);
    expect(await payment.connect(issuer2Signer).getMyBalance()).to.be.eq(0);

    // this should not override the withdrawal balance of issuer 1
    await payment
      .connect(owner)
      .updateWithdrawAddress(issuerId2.bigInt(), schemaHash3.bigInt(), issuer1Signer.address);

    expect(await payment.connect(issuer1Signer).getMyBalance()).to.be.eq(9500);
    expect(await payment.connect(issuer2Signer).getMyBalance()).to.be.eq(0);

    await payment
      .connect(owner)
      .updateWithdrawAddress(issuerId1.bigInt(), schemaHash1.bigInt(), issuer2Signer.address);

    expect(await payment.connect(issuer1Signer).getMyBalance()).to.be.eq(0);
    expect(await payment.connect(issuer2Signer).getMyBalance()).to.be.eq(9500);

    const paymentData = await payment
      .connect(issuer2Signer)
      .getPaymentData(issuerId1.bigInt(), schemaHash1.bigInt());
    expect(paymentData.withdrawAddress).to.be.eq(issuer2Signer.address);
  });

  it("updateValueToPay", async () => {
    await payment.pay("payment-id-1", issuerId1.bigInt(), schemaHash1.bigInt(), {
      value: 10000,
    });

    await payment
      .connect(issuer1Signer)
      .updateValueToPay(issuerId1.bigInt(), schemaHash1.bigInt(), 22000);

    expect(await payment.isPaymentDone("payment-id-1", issuerId1.bigInt())).to.be.eq(true);
    await expect(
      payment.pay("payment-id-2", issuerId1.bigInt(), schemaHash1.bigInt(), {
        value: 10000,
      }),
    )
      .to.be.revertedWithCustomError(payment, "InvalidPaymentValue")
      .withArgs(22000, 10000);

    expect(await payment.isPaymentDone("payment-id-2", issuerId1.bigInt())).to.be.eq(false);
    await payment.pay("payment-id-2", issuerId1.bigInt(), schemaHash1.bigInt(), {
      value: 22000,
    });

    expect(await payment.isPaymentDone("payment-id-2", issuerId1.bigInt())).to.be.eq(true);
  });

  it("getPaymentData work only for issuer or owner", async () => {
    await expect(
      payment.connect(userSigner).getPaymentData(issuerId1.bigInt(), schemaHash1.bigInt()),
    )
      .to.be.revertedWithCustomError(payment, "WrongOwnerOrIssuer")
      .withArgs(owner.address, issuer1Signer.address, userSigner.address);
  });

  it("updateOwnerPercentage work only for owner", async () => {
    await expect(
      payment
        .connect(issuer1Signer)
        .updateOwnerPercentage(issuerId1.bigInt(), schemaHash1.bigInt(), 3),
    ).to.be.revertedWithCustomError(payment, "OwnableUnauthorizedAccount");

    await payment.connect(owner).updateOwnerPercentage(issuerId1.bigInt(), schemaHash1.bigInt(), 3);

    const paymentData = await payment
      .connect(owner)
      .getPaymentData(issuerId1.bigInt(), schemaHash1.bigInt());
    expect(paymentData.ownerPercentage).to.be.eq(3);
  });

  it("updateValueToPay work only for issuer or owner", async () => {
    await expect(
      payment.connect(userSigner).updateValueToPay(issuerId1.bigInt(), schemaHash1.bigInt(), 1111),
    )
      .to.be.revertedWithCustomError(payment, "WrongOwnerOrIssuer")
      .withArgs(owner.address, issuer1Signer.address, userSigner.address);

    await payment
      .connect(issuer1Signer)
      .updateValueToPay(issuerId1.bigInt(), schemaHash1.bigInt(), 1111);

    const paymentData = await payment
      .connect(issuer1Signer)
      .getPaymentData(issuerId1.bigInt(), schemaHash1.bigInt());
    expect(paymentData.valueToPay).to.be.eq(1111);
  });

  it("updateWithdrawAddress work only for issuer or owner", async () => {
    await expect(
      payment
        .connect(userSigner)
        .updateWithdrawAddress(issuerId1.bigInt(), schemaHash1.bigInt(), issuer2Signer.address),
    )
      .to.be.revertedWithCustomError(payment, "OwnableUnauthorizedAccount")
      .withArgs(userSigner.address);

    await payment
      .connect(owner)
      .updateWithdrawAddress(issuerId1.bigInt(), schemaHash1.bigInt(), issuer2Signer.address);
    const paymentData = await payment
      .connect(issuer2Signer)
      .getPaymentData(issuerId1.bigInt(), schemaHash1.bigInt());
    expect(paymentData.withdrawAddress).to.be.eq(issuer2Signer.address);
  });

  it("test rounded division for percents", async () => {
    // set 3% to owner and payment value 25555
    await payment.setPaymentValue(
      issuerId1.bigInt(),
      schemaHash3.bigInt(),
      25555,
      3,
      issuer1Signer.address,
    );
    await payment
      .connect(userSigner)
      .pay("payment-id-1", issuerId1.bigInt(), schemaHash3.bigInt(), {
        value: 25555,
      });

    // Solidity rounds towards zero.
    // Owner part = 25555 * 3 / 100 = 766.65 => 766.
    // Issuer part = 25555 - 766 = 24789
    expect(await payment.connect(issuer1Signer).issuerWithdraw()).changeEtherBalance(
      issuer1Signer,
      24789,
    );
  });

  it("Should raise events when payment data is updated", async () => {
    await expect(
      payment.setPaymentValue(
        issuerId1.bigInt(),
        schemaHash3.bigInt(),
        100,
        5,
        issuer1Signer.address,
      ),
    )
      .to.emit(payment, "PaymentDataSet")
      .withArgs(issuerId1.bigInt(), schemaHash3.bigInt(), 100, 5, issuer1Signer.address);

    await expect(payment.updateOwnerPercentage(issuerId1.bigInt(), schemaHash1.bigInt(), 10))
      .to.emit(payment, "OwnerPercentageUpdated")
      .withArgs(issuerId1.bigInt(), schemaHash1.bigInt(), 10);

    await expect(
      payment.updateWithdrawAddress(
        issuerId1.bigInt(),
        schemaHash1.bigInt(),
        issuer2Signer.address,
      ),
    )
      .to.emit(payment, "WithdrawAddressUpdated")
      .withArgs(issuerId1.bigInt(), schemaHash1.bigInt(), issuer2Signer.address);

    await expect(payment.updateValueToPay(issuerId1.bigInt(), schemaHash1.bigInt(), 200))
      .to.emit(payment, "ValueToPayUpdated")
      .withArgs(issuerId1.bigInt(), schemaHash1.bigInt(), 200);

    await expect(
      payment.pay("payment-id-1", issuerId1.bigInt(), schemaHash1.bigInt(), {
        value: 200,
      }),
    )
      .to.emit(payment, "Payment")
      .withArgs(issuerId1.bigInt(), "payment-id-1", schemaHash1.bigInt());
  });

  it("Should throw on validation errors", async () => {
    await expect(
      payment.setPaymentValue(issuerId1.bigInt(), schemaHash3.bigInt(), 100, 5, ethers.ZeroAddress),
    )
      .to.revertedWithCustomError(payment, "InvalidWithdrawAddress")
      .withArgs(ethers.ZeroAddress);

    await expect(
      payment.setPaymentValue(
        issuerId1.bigInt(),
        schemaHash3.bigInt(),
        100,
        101,
        issuer1Signer.address,
      ),
    )
      .to.revertedWithCustomError(payment, "InvalidOwnerPercentage")
      .withArgs(101);

    await expect(payment.updateOwnerPercentage(issuerId1.bigInt(), schemaHash1.bigInt(), 101))
      .to.be.revertedWithCustomError(payment, "InvalidOwnerPercentage")
      .withArgs(101);

    await expect(
      payment.updateWithdrawAddress(issuerId1.bigInt(), schemaHash1.bigInt(), ethers.ZeroAddress),
    )
      .to.be.revertedWithCustomError(payment, "InvalidWithdrawAddress")
      .withArgs(ethers.ZeroAddress);

    await payment
      .connect(userSigner)
      .pay("payment-id-1", issuerId1.bigInt(), schemaHash1.bigInt(), {
        value: 10000,
      });

    await expect(
      payment.pay("payment-id-1", issuerId1.bigInt(), schemaHash1.bigInt(), {
        value: 10000,
      }),
    )
      .to.be.revertedWithCustomError(payment, "PaymentAlreadyDone")
      .withArgs("payment-id-1", issuerId1.bigInt());

    await expect(
      payment.pay("payment-id-2", issuerId1.bigInt(), schemaHash3.bigInt(), {
        value: 10000,
      }),
    )
      .to.be.revertedWithCustomError(payment, "NoPaymentValueFound")
      .withArgs(issuerId1.bigInt(), schemaHash3.bigInt());
  });
});
