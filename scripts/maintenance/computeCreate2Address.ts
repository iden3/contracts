import { ethers } from "hardhat";

async function main() {
  const byteCode = "<your contract byte code here>";
  const salt = "0x000000000000000000000000000000000000000000f4179bc3e4988a1a06f8d1"; // Replace your salt here;
  const create2Deployer = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed"; // This is deployer address for CreateX in every network

  const create2ContractAddress = ethers.getCreate2Address(
    create2Deployer,
    ethers.keccak256(salt),
    ethers.keccak256(byteCode),
  );

  console.log("Create2 computed address:", create2ContractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
