import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers, network } from "hardhat";
import { StateContractMigrationHelper } from "../../../helpers/StateContractMigrationHelper";
import { chainIdDefaultIdTypeMap } from "../../../helpers/ChainIdDefTypeMap";
/*
1. deploy State to mumbai from feature/state-v3 branch
2. run transit-state script
3. cp .openzeppelin/* ../../contracts/.openzeppelin/
4. update addreess and block number in data
5. run this script
*/

async function main() {

    const signers = await ethers.getSigners();
    const stateDeployHelper = await DeployHelper.initialize(null, true);
    const stateContractMigrationHelper = new StateContractMigrationHelper(stateDeployHelper, signers[0]);

    const oldContractABI = []; // abi of contract that will be upgraded
    const stateContractAddress = "";  // address of contract that will be upgraded
    const stateContractInstance = await stateContractMigrationHelper.getInitContract({
        contractNameOrAbi: oldContractABI,
        address: stateContractAddress,
    });

    const { state } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);
    const { defaultIdType } = await stateDeployHelper.getDefaultIdType();
    console.log(`Setting value for _defaultIdType = ${defaultIdType}`);
    const tx = await state.setDefaultIdType(defaultIdType);
    const receipt = await tx.wait();
    const contractDefIdType = await state.getDefaultIdType();
    console.assert(contractDefIdType.toString() === defaultIdType.toString(), "default id type wasn't initialized");
    console.log("Contract Upgrade Finished");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
