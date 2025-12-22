import { ethers } from "hardhat";

async function main() {
  const mcPaymentAddress = "0xYourMCPaymentContractAddressHere"; // replace with actual deployed contract address
  const tokenAddress = "0xYourTokenAddressHere"; // replace with actual token address
  const issuerAddress = "0xYourIssuerAddressHere"; // replace with actual issuer address
  const amount = 1000; // amount to be paid

  const [signer] = await ethers.getSigners();
  const token = await ethers.getContractAt("ERC20Token", tokenAddress);
  const signerBalance = await token.balanceOf(signer.address);
  console.log(
    `Balance ${signer.address}: ${ethers.formatEther(signerBalance)} ${await token.symbol()}`,
  );

  const payment = await ethers.getContractAt("MCPayment", mcPaymentAddress);

  const domainData = {
    name: "MCPayment",
    version: "1.0.0",
    chainId: 31337,
    verifyingContract: await payment.getAddress(),
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

  const paymentData = {
    tokenAddress: tokenAddress,
    recipient: issuerAddress,
    amount: amount,
    expirationDate: Math.round(new Date().getTime() / 1000) + 60 * 60, // 1 hour
    nonce: 35,
    metadata: "0x",
  };
  const signature = await signer.signTypedData(domainData, erc20types, paymentData);

  // approve MCPayment contract to spend tokens
  const txApprove = await token.connect(signer).approve(await payment.getAddress(), amount);
  await txApprove.wait();
  console.log(
    `${signer.address} approved ${amount} ${await token.symbol()} for MCPayment contract at ${mcPaymentAddress}`,
  );

  const erc20PaymentGas = await payment
    .connect(signer)
    .payERC20.estimateGas(paymentData, signature);
  console.log("ERC-20 Payment Gas: " + erc20PaymentGas);

  /*let ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
  console.log(`Owner ERC-20 Balance before payment: ${ownerBalance}`);*/

  const tx = await payment.connect(signer).payERC20(paymentData, signature);
  console.log("ERC-20 Payment Tx Hash: " + tx.hash);
  await tx.wait();

  /*ownerBalance = await payment.getOwnerERC20Balance(tokenAddress);
  console.log(`Owner ERC-20 Balance after payment: ${ownerBalance}`);*/
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
