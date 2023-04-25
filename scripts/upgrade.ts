import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { ethers } from "hardhat";
import { StateContractMigrationHelper } from "../helpers/StateContractMigrationHelper";
import fs from "fs";

/*
1. deploy stateV2 to mumbai from feature/state-v3 branch
2. run transit-state script
3. cp .openzeppelin/* ../../contracts/.openzeppelin/
4. update addreess and block number in data
5. run this script
*/

async function main() {
  const testId = BigInt("0x0e2c0b248f9d0cd5e1ea6ba551f9ba76f4aa7276d1f89c109f8923063b1202");
  const testState = BigInt("0x304754b7b338d8cc4f2b3ddaf94ec608a1470702784c40132ec18b48a2ee37d9");
  const signers = await ethers.getSigners();
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);
  const migrationSteps = new StateContractMigrationHelper(stateDeployHelper, signers[0]);
  const network = process.env.HARDHAT_NETWORK;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const deployInfo = require(`../../test-migration/contracts/scripts/deploy_output_final.${network}.json`);

  console.log("stateAddress", deployInfo.state);

  const startBlock = 0;
  if (process.env.HARDHAT_NETWORK === "mumbai" && !startBlock) {
    throw new Error("startBlock not set");
  }

  const initStateContract = await migrationSteps.getInitContract({
    contractNameOrAbi: require("../helpers/StateV2_0_abi_2_1.json"),
    address: deployInfo.state,
  });

  const result1 = await migrationSteps.getDataFromContract(initStateContract, testId, testState);

  fs.writeFileSync(`data-before-upgrade.${network}.json`, JSON.stringify(result1, null, 2));

  console.log("============= Start: upgradeToStateV2_migration =============");
  const { state: stateMigration, verifier } = await stateDeployHelper.upgradeToStateV2_migration(
    initStateContract.address
  );
  console.log("============= Finish: upgradeToStateV2_migration =============");

  console.log("============= Start: initForMigration =============");
  await stateMigration.initForMigration(verifier.address);
  console.log("============= Finish: initForMigration =============");

  const logHistory = await migrationSteps.readEventLogData(
    initStateContract,
    startBlock,
    1000,
    "StateUpdated",
    `${network}.eventLog.json`
  );
  const genesisStatePublishLog = {};

  await migrationSteps.migrateData(
    logHistory,
    async (args) => {
      const stateInfos = await stateMigration.getStateInfoHistoryById(args.id);
      const receipts: unknown[] = [];
      if (!genesisStatePublishLog[args.id]) {
        const genesisState = stateInfos.find(
          (info) =>
            info.createdAtTimestamp.toString() === "0" && info.createdAtBlock.toString() === "0"
        );
        if (!genesisState) {
          throw new Error("Genesis state not found");
        }
        genesisStatePublishLog[genesisState.id] = true;
        const tx = await stateMigration.addStateWithTimestampAndBlock(
          genesisState.id,
          genesisState.state,
          genesisState.createdAtTimestamp,
          genesisState.createdAtBlock
        );
        const receipt = await tx.wait();
        console.log("published genesis state tx with hash: ", receipt.transactionHash);
        receipts.push(receipt);
      }

      const tx = await stateMigration.addStateWithTimestampAndBlock(
        args.id,
        args.state,
        args.timestamp,
        args.blockN
      );
      const receipt = await tx.wait();
      receipts.push(receipt);

      console.log("published state tx with hash: ", receipt.transactionHash);

      return receipts;
    },
    `migration.results.${network}.json`
  );

  const { state: stateV2 } = await migrationSteps.upgradeContract(initStateContract);

  const result2 = await migrationSteps.getDataFromContract(stateV2, testId, testState);

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
