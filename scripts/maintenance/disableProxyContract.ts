import hre, { ethers, upgrades } from "hardhat";
import { expect } from "chai";
// import { getConfig } from "../../helpers/helperUtils";
// import { CONTRACT_NAMES } from "../../helpers/constants";

// Get proper contract address and name
const contractAddress = "<put-your-contract-address>";
// const contractAddress = getConfig().stateContractAddress;

async function main() {
  // Put proper contract name here
  const contractName = "<put-your-contract-name>";
  // const contractName = CONTRACT_NAMES.STATE;
  const contract = await ethers.getContractAt(contractName, contractAddress);

  const alwaysRevertFactory = await ethers.getContractFactory("AlwaysRevert");
  const c = await upgrades.upgradeProxy(contract, alwaysRevertFactory, {
    unsafeSkipStorageCheck: true,
  });
  await c.waitForDeployment();

  await expect(contract.someFunction()).to.be.revertedWith("The contract is disabled");

  const network = hre.network.name;
  console.log(
    `The contract ${contractName} at ${contractAddress} on network ${network} is disabled`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
