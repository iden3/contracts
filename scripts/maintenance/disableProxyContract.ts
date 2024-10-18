import hre, { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { contractsInfo } from "../../helpers/constants";

// !!!!! Get proper contract address and name, e.g. contractsInfo.STATE.unifiedAddress !!!!!
const contractAddress = "<put-your-contract-address>";

async function main() {
  // Put proper contract name here, e.g. contractsInfo.STATE.name
  const contractName = "<put-your-contract-name>";

  const contract = await ethers.getContractAt(contractName, contractAddress);

  const alwaysRevertFactory = await ethers.getContractFactory("AlwaysRevert");
  const c = await upgrades.upgradeProxy(contract, alwaysRevertFactory, {
    unsafeSkipStorageCheck: true,
  });
  await c.waitForDeployment();

  console.log("Waiting 20 seconds after contract deployment and before sanity check...");
  await new Promise((resolve) => setTimeout(resolve, 20000));

  // !!!!! Put proper function name here to make some check, e.g. getDefaultIdType() for State contract !!!!!
  await expect(contract.getDefaultIdType()).to.be.revertedWith("The contract is disabled");

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
