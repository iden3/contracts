import {
  CREATEX_FACTORY_ADDRESS,
  // SIGNED_SERIALISED_TRANSACTION_GAS_LIMIT_25000000,
  SIGNED_SERIALISED_TRANSACTION_GAS_LIMIT_3000000,
} from "../../helpers/constants";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const createXCreatorAddress = "0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5";
  const minimumBalance = ethers.parseEther("0.30");
  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;

  let bytecode = await provider.getCode(CREATEX_FACTORY_ADDRESS);

  if (bytecode !== "0x") {
    throw Error(`CreateX already deployed to ${CREATEX_FACTORY_ADDRESS}`);
  }
  const createXCreatorBalance = await provider.getBalance(createXCreatorAddress);

  console.log(
    `CreateX creator address ${createXCreatorAddress} balance: ${ethers.formatEther(
      createXCreatorBalance,
    )} ETH`,
  );

  if (createXCreatorBalance < minimumBalance) {
    console.log(
      `CreateX creator address ${createXCreatorAddress} has insufficient balance. Needs at least ${ethers.formatEther(minimumBalance)} ETH`,
    );
    console.log(
      `Sending ${ethers.formatEther(minimumBalance - createXCreatorBalance)} ETH to CreateX creator address ${createXCreatorAddress}`,
    );
    await signer.sendTransaction({
      to: createXCreatorAddress,
      value: minimumBalance - createXCreatorBalance,
    });
  }

  console.log(`Deploying CreateX contract from address: ${signer.address}`);

  const txResponse = await provider.broadcastTransaction(
    SIGNED_SERIALISED_TRANSACTION_GAS_LIMIT_3000000,
    //SIGNED_SERIALISED_TRANSACTION_GAS_LIMIT_25000000,
  );

  const txReceipt = await txResponse.wait();

  const gasUsed = txReceipt!.gasUsed; // Gas units
  const effGasPrice = txReceipt!.gasPrice; // Wei
  const gasCostETH = ethers.formatEther(gasUsed * effGasPrice); // Calculate cost in ETH

  console.log("Gas Used (units):", gasUsed.toString());
  console.log("Effective Gas Price (Wei):", effGasPrice.toString());
  console.log("Gas Cost (ETH):", gasCostETH);

  bytecode = await provider.getCode(CREATEX_FACTORY_ADDRESS);
  if (bytecode === "0x") {
    throw Error(`CreateX should've been deployed to ${CREATEX_FACTORY_ADDRESS} but it wasn't`);
  } else {
    console.log(`CreateX deployed to: ${CREATEX_FACTORY_ADDRESS}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
