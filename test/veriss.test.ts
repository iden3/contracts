import { ethers } from "hardhat";
import { Signer } from "ethers";

describe("Embedded ZKP Verifier", function () {
  let issuer: Signer, verifier: Signer;
  let vp: any;
  let domain = {
    name: "VerifierPayment",
    version: "1",
    chainId: 31337, // Mainnet ID (adjust for your network)
    verifyingContract: "0xYourContractAddress",
  };

  const amount = 1; // 1 token
  const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const nonce = 1; // Same nonce as in the signature

  const types = {
    Withdraw: [
      { name: "issuer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiration", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
  beforeEach(async () => {
    const [_verifier, _issuer] = await ethers.getSigners();
    issuer = _issuer;
    verifier = _verifier;
    const [verifierAddress, issuerAddress] = await Promise.all([
      verifier.getAddress(),
      issuer.getAddress(),
    ]);
    console.log("Verifier:", verifierAddress);
    console.log("Issuer:", issuerAddress);
    const VerifierPayment = await ethers.getContractFactory("VerifierPayment");
    vp = await VerifierPayment.deploy(verifierAddress);
    await vp.waitForDeployment();
    console.log("VerifierPayment deployed to:", await vp.getAddress());
    domain = {
      ...domain,
      verifyingContract: await vp.getAddress(),
      chainId: parseInt((await ethers.provider.getNetwork()).chainId.toString()),
    };
    vp = vp.connect(verifier);
    await vp.deposit({ value: ethers.parseEther("10") });
    console.log("Verifier balance:", ethers.formatEther(await vp.getBalance()));
    console.log("domain", domain);
  });

  it.only("Sign", async () => {
    await run();
  });

  // Verifier signs a withdrawal message
  async function signWithdrawal() {
    const value = {
      issuer: await issuer.getAddress(),
      amount: ethers.parseEther(amount.toString()), // Amount in tokens
      expiration: expiration,
      nonce: nonce,
    };

    // Sign the typed data using the EIP-712 format
    const signature = await verifier.signTypedData(domain, types, value);
    console.log("Signature:", signature);
    return signature;
  }

  // Example usage
  async function run() {
    const signature = await signWithdrawal();
    console.log("Generated EIP-712 signature:", signature);

    await withdrawTokens(signature);
  }

  async function withdrawTokens(signature) {
    const sig = ethers.Signature.from(signature);
    console.log("sig", sig);
    vp = vp.connect(issuer);
    const tx = await vp.withdraw(
      await issuer.getAddress(),
      ethers.parseEther(amount.toString()),
      expiration,
      nonce,
      sig.v,
      sig.r,
      sig.s,
    );

    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Withdrawal confirmed in block:", receipt.blockNumber);
  }
});
