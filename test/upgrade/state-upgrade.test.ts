import { ethers} from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { StateContractMigrationHelper } from "../../helpers/StateContractMigrationHelper";
import fs from 'fs';
import path from 'path';
import { publishState } from "../utils/state-utils";

const stateTransitionsWithProofs = [
  require("../state/data/user_state_genesis_transition.json"),
  require("../state/data/user_state_next_transition.json"),
];

const outputPath = '../../scripts/upgrade/state/output.json';

describe("migration test automated", () => {
    let deployHelper;
    let signers;
    let oldContractAddress;
    let oldContractAbi;

    before(async function () {
        if (!fs.existsSync(path.join(__dirname, outputPath))) {
          console.log('no output.json file found for migration test');
          return;
        }
        const migrationOutput = require(outputPath);
        signers = await ethers.getSigners();
        deployHelper = await DeployHelper.initialize();
        oldContractAddress = migrationOutput.oldContractAddress;
        oldContractAbi = require(`../../scripts/upgrade/state/abi-${migrationOutput.commit}.json`);
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
    const stateInfo = await publishState(stateContractInstance, stateTransitionsWithProofs[0]);
    const result1 = await stateContractMigrationHelper.getDataFromContract(
      stateContractInstance,
      stateInfo.id,
      stateInfo.newState
    );

    // 3. migrate 
    const { state: stateV3 } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);
  
    // 4. post upgrade checks
    const сontractCheck = await stateContractMigrationHelper.getDataFromContract(
      stateContractInstance,
      stateInfo.id,
      stateInfo.newState
    );

    await stateContractMigrationHelper.checkData(result1, сontractCheck);

  });

});