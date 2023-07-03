import { ethers} from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { StateContractMigrationHelper } from "../../helpers/StateContractMigrationHelper";

describe("migration test automated", () => {
    let deployHelper;
    let signers;
    let oldContractAddress;
    let oldContractAbi;

    before(async function () {
        signers = await ethers.getSigners();
        deployHelper = await DeployHelper.initialize();
        const output = require('../../scripts/upgrade/state/output.json');
        if (!output) {
          return;
        }
        oldContractAddress = output.oldContractAddress;
        oldContractAbi = require(`../../scripts/upgrade/state/abi-${output.commit}.json`);
  });

  it("test state contract migration", async () => {
    if (!oldContractAddress) {
      console.log('upgrade test skipped (no old contract address found)')
      return;
    }
    // 1. init old contract by abi & address
    const stateContractMigrationHelper = new StateContractMigrationHelper(deployHelper, signers[0]);
    const stateContractInstance = await stateContractMigrationHelper.getInitContract({
        contractNameOrAbi: oldContractAbi,
        address: oldContractAddress, // address of contract that will be upgraded
    });
    // 2. pre-upgrade transactions

    // 3. migrate 
    const { state: stateV3 } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);
  
    // 4. post upgrade checks

  });

});