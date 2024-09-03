import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";

/*
1. add contract address in `contractAddress` variable and old contract ABI in `oldContractABI`
2. run this script
*/

async function main() {
  const signers = await ethers.getSigners();
  const deployHelper = await DeployHelper.initialize(null, true);
  const network = process.env.HARDHAT_NETWORK;

  const oldContractABI = []; // abi of contract that will be upgraded
  const contractAddress = ""; // address of contract that will be upgraded
  const contractName = ""; // verifier contract name
  const UniversalVerifier = await ethers.getContractAt(oldContractABI, contractAddress, signers[0]);

  const verifier = await deployHelper.upgradeUniversalVerifier(contractAddress, contractName);

  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
