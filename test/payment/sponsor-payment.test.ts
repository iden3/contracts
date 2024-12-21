import { ethers, upgrades } from "hardhat";
import { ERC20Token, SponsorPayment, SponsorPayment__factory } from "../../typechain-types";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Sponsor Payment Contract", () => {
  let sponsorPaymentContract: SponsorPayment;
  let paymentContractAddr: string;
  let token: ERC20Token;
  let tokenAddr: string;
  let signers: HardhatEthersSigner[] = [];
  let domainData: { name: string; version: string; chainId: number; verifyingContract: string };
  const OWNER_FEE_PERCENTS = 10;
  const SPONSOR_WITHDRAW_DELAY = 60 * 60; // 1 hour
  const typesERC20 = {
    ERC20SponsorPaymentInfo: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "token", type: "address" },
      { name: "expiration", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "metadata", type: "bytes" },
    ],
  };
  const types = {
    ERC20SponsorPaymentInfo: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiration", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "metadata", type: "bytes" },
    ],
  };

  async function deployContractsFixture() {
    const [owner] = await ethers.getSigners();

    sponsorPaymentContract = (await upgrades.deployProxy(new SponsorPayment__factory(owner), [
      owner.address,
      OWNER_FEE_PERCENTS,
      SPONSOR_WITHDRAW_DELAY,
    ])) as unknown as SponsorPayment;
    await sponsorPaymentContract.waitForDeployment();
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
    signers = await ethers.getSigners();
    paymentContractAddr = await sponsorPaymentContract.getAddress();

    domainData = {
      name: "SponsorPayment",
      version: "1.0.0",
      chainId: 31337,
      verifyingContract: paymentContractAddr,
    };

    const tokenFactory = await ethers.getContractFactory("ERC20Token", signers[0]);
    token = await tokenFactory.deploy(1_000);
    tokenAddr = await token.getAddress();
  });

  it("check signature verification:", async () => {
    const [, sponsor, recipient] = signers;

    const paymentDataERC20 = {
      recipient: recipient.address,
      amount: 100,
      token: tokenAddr,
      expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
      nonce: 22,
      metadata: "0x",
    };
    const signatureERC20 = await sponsor.signTypedData(domainData, typesERC20, paymentDataERC20);

    const signerERC20 = await sponsorPaymentContract
      .connect(recipient)
      .recoverSponsorPaymentSignerERC20(paymentDataERC20, signatureERC20);
    expect(signerERC20).to.be.eq(sponsor.address);

    const paymentData = {
      recipient: recipient.address,
      amount: 100,
      expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
      nonce: 22,
      metadata: "0x",
    };

    const signature = await sponsor.signTypedData(domainData, types, paymentData);

    const signer = await sponsorPaymentContract
      .connect(recipient)
      .recoverSponsorPaymentSigner(paymentData, signature);
    expect(signer).to.be.eq(sponsor.address);
  });

  describe("Deposit", () => {
    it("should handle negative scenario", async () => {
      const [, sponsor, other] = signers;
      // BEGIN ERROR TESTS
      await expect(
        sponsorPaymentContract.connect(sponsor).deposit({ value: 0 }),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidDeposit");

      await expect(
        sponsorPaymentContract.connect(sponsor).depositERC20(100, other.address),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidToken");

      await expect(
        sponsorPaymentContract.connect(sponsor).depositERC20(0, tokenAddr),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidDeposit");
    });

    it("should handle token deposit", async () => {
      const [owner, sponsor, other] = signers;

      await token.connect(owner).transfer(sponsor.address, 100);
      await token.connect(owner).transfer(other.address, 200);

      expect(await token.balanceOf(sponsor.address)).to.be.eq(100);

      await token.connect(sponsor).approve(paymentContractAddr, 50);
      await token.connect(other).approve(paymentContractAddr, 100);

      await sponsorPaymentContract.connect(sponsor).depositERC20(50, tokenAddr);
      await sponsorPaymentContract.connect(other).depositERC20(100, tokenAddr);

      expect(await token.balanceOf(sponsor.address)).to.be.eq(50);
      expect(await token.balanceOf(other.address)).to.be.eq(100);

      await expect(sponsorPaymentContract.connect(sponsor).depositERC20(100, tokenAddr)).to.be
        .reverted;

      expect(
        await sponsorPaymentContract.connect(sponsor).getBalanceERC20(sponsor.address, tokenAddr),
      ).to.be.eq(50);

      await token.connect(sponsor).approve(paymentContractAddr, 50);

      await expect(await sponsorPaymentContract.connect(sponsor).depositERC20(50, tokenAddr))
        .to.emit(sponsorPaymentContract, "ERC20Deposit")
        .withArgs(sponsor.address, tokenAddr, 50);

      expect(
        await sponsorPaymentContract.connect(sponsor).getBalanceERC20(sponsor.address, tokenAddr),
      ).to.be.eq(100);
    });
  });

  describe("Withdrawal", () => {
    it("should handle withdraw", async () => {
      const [, sponsor] = signers;

      await expect(
        sponsorPaymentContract.connect(sponsor).requestWithdrawal(100),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidWithdraw");

      await sponsorPaymentContract.connect(sponsor).deposit({ value: ethers.parseEther("1.0") });

      await sponsorPaymentContract.connect(sponsor).requestWithdrawal(ethers.parseEther("0.5"));

      await expect(
        sponsorPaymentContract.connect(sponsor).requestWithdrawal(ethers.parseEther("0.5")),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidWithdraw");

      await expect(
        sponsorPaymentContract.connect(sponsor).withdraw(),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidWithdraw");
    });

    it("should handle successful withdrawal", async () => {
      const [, sponsor] = signers;
      const sponsorAddr = await sponsor.getAddress();

      await sponsorPaymentContract.connect(sponsor).deposit({ value: ethers.parseEther("1.0") });

      await sponsorPaymentContract.connect(sponsor).requestWithdrawal(ethers.parseEther("0.5"));

      await ethers.provider.send("evm_increaseTime", [SPONSOR_WITHDRAW_DELAY]);
      await ethers.provider.send("evm_mine", []);

      await expect(sponsorPaymentContract.connect(sponsor).withdraw())
        .to.emit(sponsorPaymentContract, "Withdrawal")
        .withArgs(sponsorAddr, ethers.parseEther("0.5"));
    });

    it("should handle successful ERC20 withdrawal", async () => {
      const [owner, sponsor] = signers;

      await token.connect(owner).transfer(sponsor.address, 100);
      await token.connect(sponsor).approve(paymentContractAddr, 100);
      await sponsorPaymentContract.connect(sponsor).depositERC20(100, tokenAddr);

      await sponsorPaymentContract.connect(sponsor).requestWithdrawalERC20(50, tokenAddr);

      await ethers.provider.send("evm_increaseTime", [SPONSOR_WITHDRAW_DELAY]);
      await ethers.provider.send("evm_mine", []);

      await expect(sponsorPaymentContract.connect(sponsor).withdrawERC20(tokenAddr))
        .to.emit(sponsorPaymentContract, "ERC20Withdrawal")
        .withArgs(sponsor.address, tokenAddr, 50);

      expect(await token.balanceOf(sponsor.address)).to.be.eq(50);
    });

    it("should handle withdrawal cancellation", async () => {
      const [, sponsor] = signers;
      const sponsorAddr = await sponsor.getAddress();

      await sponsorPaymentContract.connect(sponsor).deposit({ value: ethers.parseEther("1.0") });

      await sponsorPaymentContract.connect(sponsor).requestWithdrawal(ethers.parseEther("0.5"));

      await expect(sponsorPaymentContract.connect(sponsor).cancelWithdrawal())
        .to.emit(sponsorPaymentContract, "WithdrawalCancelled")
        .withArgs(sponsorAddr, ethers.parseEther("0.5"));
    });

    it("should handle ERC20 withdrawal cancellation", async () => {
      const [owner, sponsor] = signers;

      await token.connect(owner).transfer(sponsor.address, 100);
      await token.connect(sponsor).approve(paymentContractAddr, 100);
      await sponsorPaymentContract.connect(sponsor).depositERC20(100, tokenAddr);

      await sponsorPaymentContract.connect(sponsor).requestWithdrawalERC20(50, tokenAddr);

      await expect(sponsorPaymentContract.connect(sponsor).cancelWithdrawalERC20(tokenAddr))
        .to.emit(sponsorPaymentContract, "ERC20WithdrawalCancelled")
        .withArgs(sponsor.address, tokenAddr, 50);

      expect(await sponsorPaymentContract.getBalanceERC20(sponsor.address, tokenAddr)).to.be.eq(
        100,
      );
    });
  });

  describe("Claim Payment", () => {
    it("should revert on invalid recipient", async () => {
      const [, sponsor, recipient] = signers;

      const paymentData = {
        recipient: await recipient.getAddress(),
        amount: 100,
        token: ethers.ZeroAddress,
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, typesERC20, paymentData);

      await expect(
        sponsorPaymentContract.connect(sponsor).claimPayment(paymentData, signature),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidPaymentClaim");
    });

    it("should revert on expired payment", async () => {
      const [, sponsor, recipient] = signers;

      const paymentData = {
        recipient: await recipient.getAddress(),
        amount: 100,
        token: ethers.ZeroAddress,
        expiration: Math.round(new Date().getTime() / 1000) - 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, typesERC20, paymentData);

      await expect(
        sponsorPaymentContract.connect(recipient).claimPayment(paymentData, signature),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidPaymentClaim");
    });

    it("should revert on insufficient balance", async () => {
      const [, sponsor, recipient] = signers;

      const paymentData = {
        recipient: recipient.address,
        amount: 100,
        token: ethers.ZeroAddress,
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, typesERC20, paymentData);

      await expect(
        sponsorPaymentContract.connect(recipient).claimPayment(paymentData, signature),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidPaymentClaim");
    });

    it("should handle successful Ether payment claim", async () => {
      const [, sponsor, recipient] = signers;

      await sponsorPaymentContract.connect(sponsor).deposit({ value: ethers.parseEther("1.0") });
      const recipientAmountBeforeClaim = await ethers.provider.getBalance(recipient.address);

      const paymentData = {
        recipient: recipient.address,
        amount: ethers.parseEther("0.5"),
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, types, paymentData);

      await expect(sponsorPaymentContract.connect(recipient).claimPayment(paymentData, signature))
        .to.emit(sponsorPaymentContract, "PaymentClaimed")
        .withArgs(recipient.address, 22, ethers.parseEther("0.5"));

      expect(await ethers.provider.getBalance(recipient.address)).to.be.gt(
        recipientAmountBeforeClaim,
      );
    });

    it("should handle successful ERC20 payment claim", async () => {
      const [owner, sponsor, recipient] = signers;

      await token.connect(owner).transfer(sponsor.address, 100);
      await token.connect(sponsor).approve(paymentContractAddr, 100);
      await sponsorPaymentContract.connect(sponsor).depositERC20(100, tokenAddr);
      console.log("sponsor", sponsor.address);
      const amount = 50;
      const paymentData = {
        recipient: recipient.address,
        amount,
        token: tokenAddr,
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, typesERC20, paymentData);

      const balance = await sponsorPaymentContract.getBalanceERC20(sponsor.address, tokenAddr);
      console.log("balance", balance.toString());

      await expect(
        sponsorPaymentContract.connect(recipient).claimPaymentERC20(paymentData, signature),
      )
        .to.emit(sponsorPaymentContract, "ERC20PaymentClaimed")
        .withArgs(recipient.address, 22, tokenAddr, 50);

      const recipientPart = amount - (amount * OWNER_FEE_PERCENTS) / 100;
      expect(await token.balanceOf(recipient.address)).to.be.eq(recipientPart);

      const ownerPart = amount - recipientPart;
      expect(
        await sponsorPaymentContract.getBalanceERC20(
          await sponsorPaymentContract.getAddress(),
          tokenAddr,
        ),
      ).to.be.eq(ownerPart);
    });

    it("should revert on already claimed payment", async () => {
      const [, sponsor, recipient] = signers;

      await sponsorPaymentContract.connect(sponsor).deposit({ value: ethers.parseEther("1.0") });

      const paymentData = {
        recipient: recipient.address,
        amount: ethers.parseEther("0.5"),
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, types, paymentData);

      await sponsorPaymentContract.connect(recipient).claimPayment(paymentData, signature);

      expect(await sponsorPaymentContract.isPaymentClaimed(recipient.address, 22)).to.be.eq(true);

      await expect(
        sponsorPaymentContract.connect(recipient).claimPayment(paymentData, signature),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidPaymentClaim");
    });
  });

  describe("Owner Fee", () => {
    it("should allow owner to withdraw Ether balance", async () => {
      const [owner, sponsor, recipient] = signers;
      const ownerAddr = await owner.getAddress();

      await sponsorPaymentContract.connect(sponsor).deposit({ value: ethers.parseEther("1.0") });

      const paymentData = {
        recipient: recipient.address,
        amount: ethers.parseEther("0.5"),
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, types, paymentData);

      await sponsorPaymentContract.connect(recipient).claimPayment(paymentData, signature);

      const ownerBalanceBefore = await ethers.provider.getBalance(ownerAddr);

      await expect(sponsorPaymentContract.connect(owner).withdrawOwnerBalance(ethers.ZeroAddress))
        .to.emit(sponsorPaymentContract, "OwnerBalanceWithdrawn")
        .withArgs(ethers.parseEther("0.05"));

      const ownerBalanceAfter = await ethers.provider.getBalance(ownerAddr);
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("should allow owner to withdraw ERC20 balance", async () => {
      const [owner, sponsor, recipient] = signers;
      const ownerAddr = await owner.getAddress();

      await token.connect(owner).transfer(sponsor.address, 100);
      await token.connect(sponsor).approve(paymentContractAddr, 100);
      await sponsorPaymentContract.connect(sponsor).depositERC20(100, tokenAddr);

      const paymentData = {
        recipient: recipient.address,
        amount: 50,
        token: tokenAddr,
        expiration: Math.round(new Date().getTime() / 1000) + 60 * 60,
        nonce: 22,
        metadata: "0x",
      };
      const signature = await sponsor.signTypedData(domainData, typesERC20, paymentData);

      await sponsorPaymentContract.connect(recipient).claimPaymentERC20(paymentData, signature);

      const ownerBalanceBefore = await token.balanceOf(ownerAddr);

      await expect(sponsorPaymentContract.connect(owner).withdrawOwnerBalance(tokenAddr))
        .to.emit(sponsorPaymentContract, "OwnerBalanceWithdrawn")
        .withArgs(5);

      const ownerBalanceAfter = await token.balanceOf(ownerAddr);
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore + 5n);

      const sponsorBalanceAfter = await token.balanceOf(await sponsorPaymentContract.getAddress());
      expect(sponsorBalanceAfter).to.be.eq(50n);
      expect(await sponsorPaymentContract.getBalanceERC20(sponsor.address, tokenAddr)).to.be.eq(
        50n,
      );
    });

    it("should revert if no balance to withdraw", async () => {
      const [owner] = signers;

      await expect(
        sponsorPaymentContract.connect(owner).withdrawOwnerBalance(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidWithdraw");

      await expect(
        sponsorPaymentContract.connect(owner).withdrawOwnerBalance(tokenAddr),
      ).to.be.revertedWithCustomError(sponsorPaymentContract, "InvalidWithdraw");
    });
  });
});
