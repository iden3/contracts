import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { StateContractMigrationHelper } from "../../../helpers/StateContractMigrationHelper";
import fs from "fs";

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
  const migrationSteps = new StateContractMigrationHelper(stateDeployHelper, signers[0]);
  const network = process.env.HARDHAT_NETWORK;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const deployInfo = require(`../../test-migration/contracts/scripts/deploy_output_final.${network}.json`);

  console.log("stateAddress", deployInfo.state);

  const startBlock = 0;
  if (process.env.HARDHAT_NETWORK === "mumbai" && !startBlock) {
    throw new Error("startBlock not set");
  }

  const oldContractABI = [];

  const stateContractInstance = await migrationSteps.getInitContract({
    contractNameOrAbi: oldContractABI,
    address: deployInfo.state,
  });

  const result1 = await migrationSteps.getDataFromContract(
    stateContractInstance,
    testId,
    testState
  );

  fs.writeFileSync(`data-before-upgrade.${network}.json`, JSON.stringify(result1, null, 2));

  console.log("============= Start: upgradeToStateV2_migration =============");
  const verifierName = "Verifier";
  const stateContractMigrationName = "StateV2-intermediate-migration";

  const { state: stateMigration, verifier } = await stateDeployHelper.upgradeState(
    stateContractInstance.address,
    verifierName,
      stateContractMigrationName
  );
  console.log("============= Finish: upgradeToStateV2_migration =============");

  const logHistory = await migrationSteps.readEventLogData(
    stateContractInstance,
    startBlock,
    1000,
    "StateUpdated",
    `${network}.eventLog.json`
  );

  console.log("intermediateContractCheck");

  const intermediateContractCheck = await migrationSteps.getDataFromContract(
    stateMigration,
    testId,
    testState
  );
  await migrationSteps.checkData(result1, intermediateContractCheck);

  await migrationSteps.migrateData(
    logHistory,
    async (args) => {
    /*
          MIGRATION DATA LOGIC MUST BE USE THIS CALLBACK
       */
    return [];
  });

  const intermediateContractCheck2 = await migrationSteps.getDataFromContract(
    stateMigration,
    testId,
    testState
  );

  await migrationSteps.checkData(result1, intermediateContractCheck2);

  const { state } = await migrationSteps.upgradeContract(stateContractInstance);

  const result2 = await migrationSteps.getDataFromContract(state, testId, testState);

  fs.writeFileSync(`data-after-upgrade.${network}.json`, JSON.stringify(result2, null, 2));

  await migrationSteps.checkData(result1, result2);

  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
