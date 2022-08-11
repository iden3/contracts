import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { deploySmt, toJson } from "../test/deploy-utils";
import fs from "fs";

export class SmtStateMigration {
  static async getStateTransitionHistory(
    stateContract: any,
    startBlockNumber = 0, //29831814
    blockChunkSize = 3500,
    enableLogging = false
  ): Promise<any[]> {
    const filter = stateContract.filters.StateUpdated(null, null, null, null);
    const latestBlock = await ethers.provider.getBlock("latest");
    enableLogging && console.log("latestBlock Number", latestBlock.number);

    let stateTransitionHistory: unknown[] = [];

    for (
      let index = startBlockNumber;
      index <= latestBlock.number;
      index += blockChunkSize
    ) {
      let pagedHistory;
      try {
        pagedHistory = await stateContract.queryFilter(
          filter,
          index,
          index + blockChunkSize - 1
        );
      } catch (error) {
        console.error(error);
      }
      enableLogging &&
        console.log(
          `state transition history length: ${pagedHistory.length}, current block number: ${index}, latest block number: ${latestBlock.number}`
        );
      stateTransitionHistory = [...stateTransitionHistory, ...pagedHistory];
    }
    enableLogging &&
      console.log(`Total events count: ${stateTransitionHistory.length}`);

    // save data to file
    SmtStateMigration.writeFile("events-data.json", stateTransitionHistory);

    return stateTransitionHistory;
  }

  static async migrate(
    stateContract: any,
    stateTransitionHistory: any[],
    enableLogging = false
  ): Promise<void> {
    const result: {
      migratedData: any[];
      error: unknown;
      index: number;
      receipt: unknown;
    } = {
      migratedData: [],
      receipt: null,
      error: null,
      index: 0,
    };
    for (let index = 0; index < stateTransitionHistory.length; index++) {
      const [id, block, timestamp, state] = stateTransitionHistory[index].args;
      result.index = index;
      try {
        const tx = await stateContract.migrateStateToSmt(
          id,
          state,
          timestamp,
          block
        );
        const receipt = await tx.wait();
        result.migratedData.push({ id, state, timestamp, block });
        if (receipt.status !== 1) {
          result.receipt = receipt;
          break;
        }
      } catch (error) {
        console.log(error);

        result.error = error;
        break;
      }
    }
    if (!result.error) {
      enableLogging && console.log("migration completed successfully", result);
    } else {
      enableLogging && console.log("migration error", result.error);
    }
    SmtStateMigration.writeFile("migration-result.json", result);
  }

  static async upgradeState(
    stateProxyAddress: string,
    enableLogging = false
  ): Promise<any> {
    await hre.run("compile");

    const StateV2Factory = await ethers.getContractFactory("StateV2");
    // Upgrade
    const tx = await upgrades.upgradeProxy(stateProxyAddress, StateV2Factory);

    enableLogging &&
      console.log(`upgrade successful: ${tx.deployTransaction.hash}`);

    const stateContract = StateV2Factory.attach(stateProxyAddress);
    return stateContract;
  }

  private static writeFile(fileName: string, data: any): void {
    fs.writeFile(fileName, toJson(data), (err) => {
      if (err) {
        console.log(err);
        process.exit(1);
      }
    });
  }

  static async run(
    stateProxyAddress: string,
    poseidon2Address: string,
    poseidon3Address: string,
    enableLogging = true
  ): Promise<{ smt: any; stateContract: any }> {
    // const existingStateAddress = "";
    // const poseidon2Address = "";
    // const poseidon3Address = "";

    // 1. upgrade state from mock to state
    const stateContract = await SmtStateMigration.upgradeState(
      stateProxyAddress,
      enableLogging
    );

    // 2. deploy smt and set smt address to state
    const smt = await deploySmt(
      stateContract.address,
      poseidon2Address,
      poseidon3Address,
      enableLogging
    );
    await stateContract.setSmt(smt.address);

    // 3. fetch all stateTransition from event
    const stateHistory = await SmtStateMigration.getStateTransitionHistory(
      stateContract,
      0, //29831814,
      1, //3500,
      enableLogging
    );

    // 4. migrate state
    await SmtStateMigration.migrate(stateContract, stateHistory, enableLogging);

    // 5. enable state transition
    await stateContract.setTransitionStateEnabled(true);

    return {
      stateContract,
      smt,
    };
  }
}
