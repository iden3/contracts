import hre, { ethers, upgrades } from "hardhat";
import { toJson } from "../test/utils/deploy-utils";
import fs from "fs";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { poseidonContract } from "circomlibjs";

export class StateDeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false
  ) {}

  static async initialize(
    signers: SignerWithAddress | null = null,
    enableLogging = false
  ): Promise<StateDeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }
    return new StateDeployHelper(sgrs, enableLogging);
  }

  async deployStateV1(): Promise<{ state: Contract; verifier: Contract }> {
    this.log("======== StateV1: deploy started ========");

    this.log("deploying verifier...");
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();
    this.log(
      `Verifier contract deployed to address ${verifier.address} from ${this.signers[0].address}`
    );

    this.log("deploying state...");
    const State = await ethers.getContractFactory("State");
    const state = await upgrades.deployProxy(State, [verifier.address]);
    await state.deployed();
    this.log(
      `State contract deployed to address ${state.address} from ${this.signers[0].address}`
    );

    this.log("======== StateV1: deploy completed ========");
    return { state, verifier };
  }

  async deployStateV2(): Promise<{
    state: Contract;
    verifier: Contract;
    smt: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
  }> {
    this.log("======== StateV2: deploy started ========");

    const owner = this.signers[0];

    this.log("deploying verifier...");
    const verifierFactory = await ethers.getContractFactory("Verifier");
    const verifier = await verifierFactory.deploy();
    await verifier.deployed();
    this.log(
      `Verifier contract deployed to address ${verifier.address} from ${owner.address}`
    );

    this.log("deploying poseidons...");
    const { poseidon2Elements, poseidon3Elements } = await this.deployPoseidons(
      owner
    );

    this.log("deploying SMT...");
    const smt = await this.deploySmt(
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    this.log("deploying stateV2...");
    const StateV2Factory = await ethers.getContractFactory("StateV2", {
      libraries: { Smt: smt.address },
    });
    const stateV2 = await upgrades.deployProxy(
      StateV2Factory,
      [verifier.address],
      {
        unsafeAllowLinkedLibraries: true,
      }
    );
    await stateV2.deployed();
    await stateV2.setTransitionStateEnabled(true);
    this.log(
      `StateV2 contract deployed to address ${stateV2.address} from ${owner.address}`
    );

    this.log("======== StateV2: deploy completed ========");

    return {
      state: stateV2,
      verifier,
      smt,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
    };
  }

  async migrateFromStateV1toV2(
    stateProxyAddress: string,
    firstEventBlock = 0,
    eventsChunkSize = 3500
  ): Promise<{ state: any }> {
    this.log("======== StateV2: migrate from StateV1 started ========");
    // 1. upgrade state from mock to state
    const stateContract = await this.upgradeState(stateProxyAddress);

    // 2. fetch all stateTransition from event
    const stateHistory = await this.getStateTransitionHistory(
      stateContract,
      firstEventBlock, //29831814,
      eventsChunkSize //3500,
    );

    // 3. migrate state. State transition will be disabled automatically
    await this.migrate(stateContract, stateHistory);

    // 4. enable state transition
    await stateContract.setTransitionStateEnabled(true);

    this.log("======== StateV2: migrate from StateV1 completed ========");
    return {
      state: stateContract,
    };
  }

  async getStateTransitionHistory(
    stateContract: any,
    firstEventBlock: number, //29831814
    eventsChunkSize: number
  ): Promise<any[]> {
    const filter = stateContract.filters.StateUpdated(null, null, null, null);
    const latestBlock = await ethers.provider.getBlock("latest");
    this.log(
      "startBlock",
      firstEventBlock,
      "latestBlock Number",
      latestBlock.number
    );

    let stateTransitionHistory: unknown[] = [];

    for (
      let index = firstEventBlock;
      index <= latestBlock.number;
      index += eventsChunkSize
    ) {
      let pagedHistory;
      try {
        pagedHistory = await stateContract.queryFilter(
          filter,
          index,
          index + eventsChunkSize - 1
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

  async upgradeState(
    stateProxyAddress: string,
    enableLogging = false
  ): Promise<any> {
    await hre.run("compile");

    const [owner] = await ethers.getSigners();

    const { poseidon2Elements, poseidon3Elements } = await this.deployPoseidons(
      owner
    );

    const smt = await this.deploySmt(
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    const StateV2Factory = await ethers.getContractFactory("StateV2", {
      libraries: { Smt: smt.address },
    });

    // Upgrade
    const tx = await upgrades.upgradeProxy(stateProxyAddress, StateV2Factory, {
      unsafeAllowLinkedLibraries: true,
    });

    const stateContract = StateV2Factory.attach(stateProxyAddress);
    await stateContract.setTransitionStateEnabled(false);
    this.log(`upgrade successful in tx: ${tx.deployTransaction.hash}`);

    return stateContract;
  }

  async deploySmt(
    poseidon2Address: string,
    poseidon3Address: string,
    contractName = "Smt"
  ): Promise<any> {
    const Smt = await ethers.getContractFactory(contractName, {
      libraries: {
        PoseidonUnit2L: poseidon2Address,
        PoseidonUnit3L: poseidon3Address,
      },
    });
    const smt = await Smt.deploy();
    await smt.deployed();
    this.enableLogging &&
      this.log(`${contractName} deployed to:  ${smt.address}`);

    return smt;
  }

  async deployPoseidons(
    deployer: SignerWithAddress,
  ): Promise<{
    poseidon2Elements: Contract;
    poseidon3Elements: Contract;
  }> {
    const abi2 = poseidonContract.generateABI(2);
    const code2 = poseidonContract.createCode(2);
    const Poseidon2Elements = new ethers.ContractFactory(abi2, code2, deployer);
    const poseidon2Elements = await Poseidon2Elements.deploy();
    await poseidon2Elements.deployed();
    this.enableLogging &&
      this.log("Poseidon3Elements deployed to:", poseidon2Elements.address);

    const abi3 = poseidonContract.generateABI(3);
    const code3 = poseidonContract.createCode(3);
    const Poseidon3Elements = new ethers.ContractFactory(abi3, code3, deployer);
    const poseidon3Elements = await Poseidon3Elements.deploy();
    await poseidon3Elements.deployed();
    this.enableLogging &&
      this.log("Poseidon3Elements deployed to:", poseidon3Elements.address);

    return {
      poseidon2Elements,
      poseidon3Elements,
    };
  }

  private writeFile(fileName: string, data: any): void {
    fs.writeFileSync(fileName, toJson(data));
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}
