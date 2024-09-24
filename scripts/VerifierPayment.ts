import { ethers } from "hardhat";

async function main() {
  const [verifier] = await ethers.getSigners();
  const VerifierPayment = await ethers.getContractFactory("VerifierPayment");
  const vp = await VerifierPayment.deploy(await verifier.getAddress());
  await vp.waitForDeployment();
  console.log("VerifierPayment deployed to:", await vp.getAddress());
}

getBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function signWithdrawal(issuer) {
  const value = {
    issuer,
    amount: ethers.parseEther("0.0001"), // Amount in tokens
    expiration: Math.floor(Date.now() / 1000) + 3600 * 24,
    nonce: 2,
  };

  const types = {
    Withdraw: [
      { name: "issuer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiration", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const domain = {
    name: "VerifierPayment",
    version: "1",
    chainId: 59141, // Mainnet ID (adjust for your network)
    verifyingContract: "0x4aCEbFb216F7da06F30D972Fce0Cd8569c26640d",
  };

  console.log(domain);

  const [verifier] = await ethers.getSigners();

  // Sign the typed data using the EIP-712 format
  const signature = await verifier.signTypedData(domain, types, value);
  console.log("Signature:", signature);
  const sig = ethers.Signature.from(signature);
  console.log("sig", JSON.stringify(sig, null, 2));
  return { signature, value };
}

async function depositValue() {
  const [verifier] = await ethers.getSigners();
  const VerifierPayment = await ethers.getContractFactory("VerifierPayment");
  const vp = VerifierPayment.attach("0x4aCEbFb216F7da06F30D972Fce0Cd8569c26640d");
  vp.connect(verifier);
  console.log("VerifierPayment deployed to:", await vp.getAddress());
  await vp.deposit({ value: ethers.parseEther("0.001") });
  console.log("Verifier balance:", ethers.formatEther(await vp.getBalance()));
}

async function withdraw() {
  const [verifier, issuer] = await ethers.getSigners();
  const VerifierPayment = await ethers.getContractFactory("VerifierPayment");
  const vp = VerifierPayment.attach("0x4aCEbFb216F7da06F30D972Fce0Cd8569c26640d");
  vp.connect(issuer);
  const { signature, value } = await signWithdrawal(await issuer.getAddress());
  const sig = ethers.Signature.from(signature);
  const tx = await vp.withdraw(
    value.issuer,
    value.amount,
    value.expiration,
    value.nonce,
    sig.v,
    sig.r,
    sig.s,
  );
  console.log("Withdraw tx:", tx.hash);
  await tx.wait();
  console.log("Verifier balance:", ethers.formatEther(await vp.getBalance()));
}

async function getBalance() {
  const [verifier] = await ethers.getSigners();
  const VerifierPayment = await ethers.getContractFactory("VerifierPayment");
  const vp = VerifierPayment.attach("0x4aCEbFb216F7da06F30D972Fce0Cd8569c26640d");
  vp.connect(verifier);
  console.log("Verifier balance:", ethers.formatEther(await vp.getBalance()));
}
