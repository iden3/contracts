import { ethers} from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { StateContractMigrationHelper } from "../../helpers/StateContractMigrationHelper";

describe.skip("migration test automated", () => {
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
      require('../../scripts/upgrade/state/abi-{commit_hash}.json'); // abi of contract that will be upgraded
    const stateContractAddress = 'contract_address_placeholder'  // address of contract that will be upgraded
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