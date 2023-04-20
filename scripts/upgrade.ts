import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { ethers } from "hardhat";
import { StateTestContractMigrationSteps } from "../helpers/MigrationHelper";

/*
1. deploy stateV2 to mumbai from feature/state-v3 branch
2. run transit-state script
3. cp .openzeppelin/* ../../contracts/.openzeppelin/
4. update addreess and block number in data
5. run this script
*/

async function main() {
  const signers = await ethers.getSigners();
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);
  const migrationSteps = new StateTestContractMigrationSteps(stateDeployHelper, signers[0]);

  const initStateContract = await migrationSteps.getInitContract({
    contractNameOrAbi: require("../helpers/StateV2_0_abi_2_1.json"),
    address: "0x60FEaDDc2E5cc3B74D9B49Cc9b0347636E4b6d6E",
  });

  // const statesWithProofs = [
  //   require("../test/state/data/user_state_genesis_transition.json"),
  //   require("../test/validators/common-data/issuer_genesis_state.json"),
  //   require("../test/validators/common-data/issuer_next_state_transition.json"),
  //   require("../test/state/data/user_state_next_transition.json"),
  // ];
  // await migrationSteps.populateData(initStateContract, statesWithProofs);

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
    34572927,
    1000,
    "StateUpdated",
    "test.mumbai.eventLog.json"
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
        console.log(
          "published genesis state tx with hash: ",
          receipt.transactionHash,
          receipt.transactionHash === tx.hash
        );
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

      console.log("receipt: ", receipt.transactionHash);

      return receipts;
    },
    "migration.mumbai.receipts.json"
  );

  const { state: statev2 } = await migrationSteps.upgradeContract(initStateContract);
  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
