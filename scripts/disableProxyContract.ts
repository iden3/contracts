import { getConfig } from "../helpers/helperUtils";
import { ethers, upgrades } from "hardhat";

const config = getConfig();

// Get proper contract address and name
const contractAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
const contractName = "State";

if (!ethers.isAddress(contractAddress)) {
  throw new Error("Proxy contract address is not set");
}

async function main() {
  const alwaysRevertFactory = await ethers.getContractFactory("AlwaysRevert");
  await upgrades.upgradeProxy(config.stateContractAddress, alwaysRevertFactory, {
    unsafeSkipStorageCheck: true,
  });
  const contract = await ethers.getContractAt(contractName, contractAddress);

  // await expect(contract.getDefaultIdType()).to.be.revertedWith("The contract is disabled");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
