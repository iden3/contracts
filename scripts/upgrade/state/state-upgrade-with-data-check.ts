import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { StateContractMigrationHelper } from "../../../helpers/StateContractMigrationHelper";
import fs from "fs";
import { Contract } from "ethers";

/*
1. deploy state to mumbai from feature/state-v3 branch
2. run transit-state script
3. cp .openzeppelin/* ../../contracts/.openzeppelin/
4. update addreess and block number in data
5. run this script
*/

async function main() {

    const testId = BigInt("0x0e2c0b248f9d0cd5e1ea6ba551f9ba76f4aa7276d1f89c109f8923063b1202");
    const testState = BigInt("0x304754b7b338d8cc4f2b3ddaf94ec608a1470702784c40132ec18b48a2ee37d9");
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

    const result1 = await stateContractMigrationHelper.getDataFromContract(stateContractInstance, testId, testState);

    fs.writeFileSync(`data-before-upgrade.${network}.json`, JSON.stringify(result1, null, 2));

    const { state } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);

    const result2 = await stateContractMigrationHelper.getDataFromContract(state, testId, testState);

    fs.writeFileSync(`data-after-upgrade.${network}.json`, JSON.stringify(result2, null, 2));

    await stateContractMigrationHelper.checkData(result1, result2);

    console.log("Contract Upgrade Finished");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
