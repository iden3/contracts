import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { StateContractMigrationHelper } from "../../../helpers/StateContractMigrationHelper";
import fs from "fs";
import { Contract } from "ethers";

/*
1. add migration specific transactions (init new state etc..)
2. run deploy-from-commit.sh with commit of previously deployed contract
3. add contract addtess in `stateContractAddress` variable
4. run this script
*/

async function main() {
    const signers = await ethers.getSigners();
    const stateDeployHelper = await DeployHelper.initialize(null, true);
    const stateContractMigrationHelper = new StateContractMigrationHelper(stateDeployHelper, signers[0]);
    const network = process.env.HARDHAT_NETWORK;

    const oldContractABI = [];  // abi of contract that will be upgraded
    const stateContractAddress = "";  // address of contract that will be upgraded
    const stateContractInstance = await stateContractMigrationHelper.getInitContract({
        contractNameOrAbi: oldContractABI,
        address: stateContractAddress,
    });

    const { state } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);

    console.log("Contract Upgrade Finished");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
