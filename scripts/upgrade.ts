import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { ethers } from "hardhat";
import { StateTestContractMigrationSteps } from "../helpers/MigrationHelper";
import { Contract } from "ethers";
import fs from "fs";

/*
1. deploy stateV2 to mumbai from feature/state-v3 branch
2. run transit-state script
3. cp .openzeppelin/* ../../contracts/.openzeppelin/
4. update addreess and block number in data
5. run this script
*/

export async function getDataFromContract(
  contract: Contract,
  id: bigint,
  state: bigint,
  fileName: string
): Promise<any> {
  const stateInfoHistoryLengthById = await contract.getStateInfoHistoryLengthById(id);
  const latestStateInfoById = await contract.getStateInfoById(id);
  const stateInfoByIdAndState = await contract.getStateInfoByIdAndState(id, state);
  const stateInfoHistory = await contract.getStateInfoHistoryById(id, 0, 3);
  const root = await contract.getGISTRoot();
  const rootInfo = await contract.getGISTRootInfo(root);
  const gistProof = await contract.getGISTProof(id);
  const gistProofByRoot = await contract.getGISTProofByRoot(id, root);

  const result = {
    stateInfoHistoryLengthById,
    latestStateInfoById,
    stateInfoByIdAndState,
    stateInfoHistory,
    root,
    gistProof,
    rootInfo,
    gistProofByRoot,
  };

  fs.writeFileSync(fileName, JSON.stringify(result, null, 2));

  return result;
}

function checkData(result1, result2): void {
  const {
    stateInfoHistoryLengthById: stateInfoHistoryLengthByIdV1,
    latestStateInfoById: latestStateInfoByIdV1,
    stateInfoByIdAndState: stateInfoByIdAndStateV1,
    stateInfoHistory: stateInfoHistoryV1,
    root: rootV1,
    gistProof: gistProofV1,
    rootInfo: rootInfoV1,
    gistProofByRoot: gistProofByRootV1,
  } = result1;

  const {
    stateInfoHistoryLengthById: stateInfoHistoryLengthByIdV2,
    latestStateInfoById: latestStateInfoByIdV2,
    stateInfoByIdAndState: stateInfoByIdAndStateV2,
    stateInfoHistory: stateInfoHistoryV2,
    root: rootV2,
    gistProof: gistProofV2,
    rootInfo: rootInfoV2,
    gistProofByRoot: gistProofByRootV2,
  } = result2;

  console.log(stateInfoHistoryLengthByIdV2.toString());
  console.log(latestStateInfoByIdV2.id.toString());
  console.log(latestStateInfoByIdV2.state.toString());
  console.log("root", rootV2.toString());

  console.assert(rootV2.toString() === rootV1.toString(), "root not equal");

  console.assert(
    stateInfoHistoryLengthByIdV2.toString() === stateInfoHistoryLengthByIdV1.toString(),
    "length not equal"
  );
  console.assert(
    latestStateInfoByIdV2.id.toString() === latestStateInfoByIdV1.id.toString(),
    "latestStateInfoById id not equal"
  );
  console.assert(
    latestStateInfoByIdV2.state.toString() === latestStateInfoByIdV1.state.toString(),
    " latestStateInfoByIdV2 state not equal"
  );
  console.assert(
    stateInfoByIdAndStateV2.id.toString() === stateInfoByIdAndStateV1.id.toString(),
    "stateInfoByIdAndStateV2 id not equal"
  );
  console.assert(
    stateInfoByIdAndStateV2.state.toString() === stateInfoByIdAndStateV1.state.toString(),
    "stateInfoByIdAndStateV2 state not equal"
  );
  console.assert(
    stateInfoHistoryV2.length === stateInfoHistoryV1.length && stateInfoHistoryV2.length !== 0,
    "stateInfoHistoryV2 length not equal"
  );

  console.assert(
    rootInfoV1.root.toString() === rootInfoV2.root.toString(),
    "rootInfo root before upgrade is  not equal to rootInfo root after upgrade"
  );

  console.assert(
    JSON.stringify(gistProofV1) === JSON.stringify(gistProofV2),
    "gistProof before upgrade is  not equal to gistProof after upgrade"
  );

  console.assert(
    JSON.stringify(gistProofByRootV1) === JSON.stringify(gistProofByRootV2),
    "gistProofByRoot before upgrade is  not equal to gistProofByRoot after upgrade"
  );
}

async function main() {
  const testId = BigInt("0x0e2c0b248f9d0cd5e1ea6ba551f9ba76f4aa7276d1f89c109f8923063b1202");
  const testState = BigInt("0x304754b7b338d8cc4f2b3ddaf94ec608a1470702784c40132ec18b48a2ee37d9");
  const signers = await ethers.getSigners();
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);
  const migrationSteps = new StateTestContractMigrationSteps(stateDeployHelper, signers[0]);
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

  const result1 = await getDataFromContract(
    initStateContract,
    testId,
    testState,
    `data-before-upgrade.${network}.json`
  );

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

  const result2 = await getDataFromContract(
    stateV2,
    testId,
    testState,
    `data-after-upgrade.${network}.json`
  );

  checkData(result1, result2);

  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
