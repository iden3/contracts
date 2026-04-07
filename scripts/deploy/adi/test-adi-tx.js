const { ethers } = require("ethers");

async function main() {
  const rpc = "https://rpc.ab.testnet.adifoundation.ai";
  const provider = new ethers.JsonRpcProvider(rpc, {
    name: "adiTestnet",
    chainId: 99999,
  });

  const privateKey = "YOUR_FUNDED_PRIVATE_KEY_HERE";
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Wallet address:", await wallet.getAddress());

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance));

  const feeData = await provider.getFeeData();
  console.log("Fee data:", {
    gasPrice: feeData.gasPrice?.toString(),
    maxFeePerGas: feeData.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
  });

  const nonce = await provider.getTransactionCount(wallet.address, "latest");
  console.log("Nonce:", nonce);

  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0n,
    nonce,
    gasLimit: 21000n,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: feeData.maxFeePerGas ?? feeData.gasPrice ?? ethers.parseUnits("600", "gwei"),
    chainId: 99999,
    type: 2,
  });

  console.log("TX hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Receipt:", receipt);
}

main().catch(console.error);