import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { BytesLike, Contract, ContractInterface, Wallet } from "ethers";
import * as fs from "fs";
import { toJson } from "../test/utils/state-utils";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = Date.now();
    console.log(`========= Executing function ${key}...==========`);
    const result = await originalMethod.apply(this, args);
    const end = Date.now();
    const time = (end - start) / 1000;
    console.log(
      `========= Finished executing function ${key}, duration: ${time} seconds =========`
    );
    return result;
  };

  return descriptor;
}

export interface EventLogEntry {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  removed: boolean;
  address: string;
  data: string;
  topics: string[];
  transactionHash: string;
  logIndex: number;
  event: string;
  eventSignature: string;
  args: {
    type: string;
    hex: string;
  }[];
}

export interface MigrationResult {
  migratedData: {
    args: {
      type: string;
      hex: string;
    }[];
    tx: string;
  }[];
  error: string | null;
  index: number;
  receipt: unknown;
}

export interface IContractMigrationSteps {
  getInitContract(contractMeta: {
    address?: string;
    contractName?: string;
    abi?: ContractInterface;
    bytecode?: string | BytesLike;
  }): Promise<Contract>;

  populateData(contract: Contract, stateTransitionPayload: any[]): Promise<void>;

  getDataFromContract(contract: Contract, ...args: any[]): Promise<any>;

  checkData(...args: any[]): Promise<any>;

  readEventLogData(
    contract: Contract,
    firstEventBlock: number,
    eventsChunkSize: number,
    eventName?: string,
    fileName?: string
  ): Promise<EventLogEntry[]>;

  migrateData(
    data: EventLogEntry[],
    populateDataFn: (...args) => Promise<any>,
    fileName?: string
  ): Promise<MigrationResult>;

  upgradeContract(contract: Contract): Promise<any>;
}

export abstract class ContractMigrationSteps implements IContractMigrationSteps {
  constructor(protected readonly _signer: SignerWithAddress | Wallet) {}

  abstract getDataFromContract(contract: Contract, ...args: any[]): Promise<any>;

  abstract populateData(contract: Contract, stateTransitionPayload: any[]): Promise<void>;

  abstract upgradeContract(contract: Contract, afterUpgrade?: () => Promise<void>): Promise<any>;

  abstract checkData(...args: any[]): Promise<any>;

  @log
  getInitContract(contractMeta: {
    contractNameOrAbi?: string | any[];
    address?: string;
  }): Promise<Contract> {
    if (Object.keys(contractMeta).every((key) => !contractMeta[key])) {
      throw new Error("contract meta is empty");
    }

    if (contractMeta.address && contractMeta.contractNameOrAbi) {
      return ethers.getContractAt(
        contractMeta.contractNameOrAbi,
        contractMeta.address,
        this._signer
      );
    }

    throw new Error("Invalid contract meta");
  }

  @log
  async readEventLogData(
    contract: Contract,
    firstEventBlock: number,
    eventsChunkSize: number,
    eventName: string,
    fileName = "events-data.json"
  ): Promise<any[]> {
    const filter = contract.filters[eventName](null, null, null, null);
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log("startBlock", firstEventBlock, "latestBlock Number", latestBlock.number);

    let logHistory: unknown[] = [];

    for (let index = firstEventBlock; index <= latestBlock.number; index += eventsChunkSize) {
      let pagedHistory;
      try {
        const toBlock =
          index + eventsChunkSize > latestBlock.number
            ? latestBlock.number
            : index + eventsChunkSize - 1;
        pagedHistory = await contract.queryFilter(filter, index, toBlock);
      } catch (error) {
        console.error(error);
      }
      console.log(
        `state transition history length: ${pagedHistory.length}, current block number: ${index}, latest block number: ${latestBlock.number}`
      );
      logHistory = [...logHistory, ...pagedHistory];
    }
    console.log(`Total events count: ${logHistory.length}`);

    if (fileName) {
      this.writeFile(fileName, logHistory);
    }

    return logHistory;
  }

  @log
  async migrateData(
    data: EventLogEntry[],
    populateDataFn: (...args) => Promise<any>,
    fileName = "migration-result.json"
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      migratedData: [],
      receipt: null,
      error: null,
      index: 0,
    };
    for (let idx = 0; idx < data.length; idx++) {
      result.index = idx;
      try {
        const args = data[idx].args;
        const receipts = await populateDataFn(args);
        for (const receipt of receipts) {
          result.migratedData.push({
            args,
            tx: receipt.transactionHash,
          });
          if (receipt.status !== 1) {
            result.receipt = receipt;
            result.error = "receipt status failed";
            break;
          }
        }
      } catch (error) {
        console.error(error);

        result.error =
          typeof error === "string"
            ? error
            : JSON.stringify(error, Object.getOwnPropertyNames(error));
        console.log("migration error", result.error, result.receipt);

        this.writeFile(fileName, result);
        throw error;
      }
    }

    console.log("migration completed successfully");
    this.writeFile(fileName, result);

    return result;
  }

  protected writeFile(fileName: string, data: unknown): void {
    fs.writeFileSync(fileName, toJson(data));
  }
}
