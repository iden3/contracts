import { ethers} from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { StateContractMigrationHelper } from "../../helpers/StateContractMigrationHelper";

describe("migration test automated", () => {
    let deployHelper;
    let signers;

    before(async function () {
        signers = await ethers.getSigners();
        deployHelper = await DeployHelper.initialize();
  });

  it("test state contract migration", async () => {
    // 1. init old contract by abi & address
    const stateContractMigrationHelper = new StateContractMigrationHelper(deployHelper, signers[0]);
    const oldContractABI = 
      require('../../scripts/upgrade/state/abi-2b45246c7a674c1a824ddd599b0be7e154fa66fb.json'); // abi of contract that will be upgraded
    const stateContractAddress = "0x683d9CDD3239E0e01E8dC6315fA50AD92aB71D2d"  // address of contract that will be upgraded
    const stateContractInstance = await stateContractMigrationHelper.getInitContract({
        contractNameOrAbi: oldContractABI,
        address: stateContractAddress,
    });
    // 2. pre-upgrade transactions

    // 3. migrate 
    const { state: stateV3 } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);
  
    // 4. post upgrade checks

  });

});