import { getConfig } from "../helpers/helperUtils";
import { ethers, upgrades } from "hardhat";
import { expect } from "chai";

const config = getConfig();

// Get proper contract address and name
const contractAddress = "<put contract address here>";

if (!ethers.isAddress(contractAddress)) {
  throw new Error("Proxy contract address is not set");
}

async function main() {
  const alwaysRevertFactory = await ethers.getContractFactory("AlwaysRevert");
  await upgrades.upgradeProxy(config.stateContractAddress, alwaysRevertFactory, {
    unsafeSkipStorageCheck: true,
  });

  // Put proper contract name here
  // const contractName = "<pub contract name here>";
  // const contract = await ethers.getContractAt(contractName, contractAddress);
  // await expect(contract.getDefaultIdType()).to.be.revertedWith("The contract is disabled");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
