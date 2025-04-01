import { ethers } from "hardhat";
import {
  CREATEX_FACTORY_ADDRESS,
  SIGNED_SERIALISED_TRANSACTION_GAS_LIMIT_25000000,
} from "../../helpers/constants";

async function main() {
  const [signer] = await ethers.getSigners();

  await signer.sendTransaction({
    to: "0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5",
    value: ethers.parseEther("100.0"),
  });
  const provider = ethers.provider;
  const txResponse = await provider.broadcastTransaction(SIGNED_SERIALISED_TRANSACTION_GAS_LIMIT_25000000);

  await txResponse.wait();

  const bytecode = await provider.getCode(CREATEX_FACTORY_ADDRESS);
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
