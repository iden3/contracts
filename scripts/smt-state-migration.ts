import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { deploySmt, toJson } from "../test/deploy-utils";
import fs from "fs";

export class SmtStateMigration {
  constructor(private readonly enableLogging: boolean = false) {}

  async getStateTransitionHistory(
    stateContract: any,
    startBlockNumber = 0, //29831814
    blockChunkSize = 3500
  ): Promise<any[]> {
    const filter = stateContract.filters.StateUpdated(null, null, null, null);
    const latestBlock = await ethers.provider.getBlock("latest");
    this.log(
      "startBlock",
      startBlockNumber,
      "latestBlock Number",
      latestBlock.number
    );

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
      this.log(
        `state transition history length: ${pagedHistory.length}, current block number: ${index}, latest block number: ${latestBlock.number}`
      );
      stateTransitionHistory = [...stateTransitionHistory, ...pagedHistory];
    }
    this.log(`Total events count: ${stateTransitionHistory.length}`);

    // save data to file
    this.writeFile("events-data.json", stateTransitionHistory);

    return stateTransitionHistory;
  }

  async migrate(
    stateContract: any,
    stateTransitionHistory: any[]
  ): Promise<void> {
    const result: {
      migratedData: any[];
      error: unknown;
      index: number;
      receipt: { status: number } | null;
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
        result.migratedData.push({
          id,
          state,
          timestamp,
          block,
          tx: tx.hash,
        });
        if (receipt.status !== 1) {
          result.receipt = receipt;
          result.error = "receipt status failed";
          break;
        }
      } catch (error) {
        console.error(error);

        result.error =
          typeof error === "string"
            ? error
            : JSON.stringify(error, Object.getOwnPropertyNames(error));

        break;
      }
    }
    if (!result.error) {
      this.log("migration completed successfully");
    } else {
      this.log("migration error", result.error, result.receipt);
    }
    this.writeFile("migration-result.json", result);
  }

  async upgradeState(stateProxyAddress: string): Promise<any> {
    await hre.run("compile");

    const StateV2Factory = await ethers.getContractFactory("StateV2");
    // Upgrade
    const tx = await upgrades.upgradeProxy(stateProxyAddress, StateV2Factory);

    this.log(`upgrade successful: ${tx.deployTransaction.hash}`);

    const stateContract = StateV2Factory.attach(stateProxyAddress);
    return stateContract;
  }

  private writeFile(fileName: string, data: any): void {
    fs.writeFileSync(fileName, toJson(data));
  }

  async run(
    stateProxyAddress: string,
    poseidon2Address: string,
    poseidon3Address: string,
    startBlockNumber: number, //29831814
    blockChunkSize: number
  ): Promise<{ smt: any; stateContract: any }> {
    // 1. upgrade state from mock to state
    const stateContract = await this.upgradeState(stateProxyAddress);

    // 2. deploy smt and set smt address to state
    const smt = await deploySmt(
      stateContract.address,
      poseidon2Address,
      poseidon3Address,
      true
    );
    const tx = await stateContract.setSmt(smt.address);

    const receipt = await tx.wait();
    if (receipt.status !== 1) {
      this.log(receipt);
      throw new Error("setSmt failed");
    }

    // 3. fetch all stateTransition from event
    const stateHistory = await this.getStateTransitionHistory(
      stateContract,
      startBlockNumber, //29831814,
      blockChunkSize //3500,
    );

    // 4. migrate state
    await this.migrate(stateContract, stateHistory);

    // 5. enable state transition
    await stateContract.setTransitionStateEnabled(true);

    return {
      stateContract,
      smt,
    };
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}
