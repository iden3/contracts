import { ethers, upgrades } from "hardhat";
import { toJson } from "../test/utils/deploy-utils";
import fs from "fs";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "../test/utils/deploy-poseidons.util";

const GIST_MAX_DEPTH = 64;

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
    smtLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
  }> {
    this.log("======== StateV2: deploy started ========");

    const owner = this.signers[0];

    this.log("deploying verifier...");

    const verifierFactory = await ethers.getContractFactory("VerifierV2");
    const verifier = await verifierFactory.deploy();
    await verifier.deployed();
    this.log(
      `Verifier contract deployed to address ${verifier.address} from ${owner.address}`
    );

    this.log("deploying poseidons...");
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements] =
      await deployPoseidons(owner, [1, 2, 3]);

    this.log("deploying SmtLib...");
    const smtLib = await this.deploySmtLib(
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib();

    this.log("deploying stateV2...");
    const StateV2Factory = await ethers.getContractFactory("StateV2", {
      libraries: {
        StateLib: stateLib.address,
        SmtLib: smtLib.address,
        PoseidonUnit1L: poseidon1Elements.address,
      },
    });
    const stateV2 = await upgrades.deployProxy(
      StateV2Factory,
      [verifier.address],
      {
      unsafeAllowLinkedLibraries: true,
    });
    await stateV2.deployed();
    this.log(
      `StateV2 contract deployed to address ${stateV2.address} from ${owner.address}`
    );

    this.log("======== StateV2: deploy completed ========");

    return {
      state: stateV2,
      verifier,
      smtLib: smtLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
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

  async populateSmtByStateEvents(
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
        const tx = await stateContract.addToSmtDirectly(
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

  async deploySmtLib(
    poseidon2Address: string,
    poseidon3Address: string,
    contractName = "SmtLib"
  ): Promise<Contract> {
    const SmtLib = await ethers.getContractFactory(contractName, {
      libraries: {
        PoseidonUnit2L: poseidon2Address,
        PoseidonUnit3L: poseidon3Address,
      },
    });
    const smtLib = await SmtLib.deploy();
    await smtLib.deployed();
    this.enableLogging &&
      this.log(`${contractName} deployed to:  ${smtLib.address}`);

    return smtLib;
  }

  async deployStateLib(): Promise<Contract> {
    const StateLib = await ethers.getContractFactory("StateLib");
    const stateLib = await StateLib.deploy();
    await stateLib.deployed();
    this.enableLogging &&
      this.log(`StateLib deployed to:  ${stateLib.address}`);

    return stateLib;
  }

  async deploySmtLibTestWrapper(maxDepth?: number): Promise<Contract> {
    const contractName = "SmtLibTestWrapper";
    const owner = this.signers[0];

    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      owner,
      [2, 3]
    );

    const smtLib = await this.deploySmtLib(
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    const SmtWrapper = await ethers.getContractFactory(contractName, {
      libraries: {
        SmtLib: smtLib.address,
      },
    });
    const smtWrapper = await SmtWrapper.deploy(maxDepth ?? GIST_MAX_DEPTH);
    await smtWrapper.deployed();
    this.enableLogging &&
      this.log(`${contractName} deployed to:  ${smtWrapper.address}`);

    return smtWrapper;
  }

  async deployBinarySearchTestWrapper(): Promise<Contract> {
    const owner = this.signers[0];

    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      owner,
      [2, 3]
    );

    const smtLib = await this.deploySmtLib(
      poseidon2Elements.address,
      poseidon3Elements.address
    );

    const bsWrapperName = "BinarySearchTestWrapper";
    const BSWrapper = await ethers.getContractFactory(bsWrapperName, {
      libraries: {
        SmtLib: smtLib.address,
      },
    });
    const bsWrapper = await BSWrapper.deploy();
    await bsWrapper.deployed();
    this.enableLogging &&
      this.log(`${bsWrapperName} deployed to:  ${bsWrapper.address}`);

    return bsWrapper;
  }

  async deploySearchUtils(stateContract: Contract): Promise<{
    searchUtils: Contract;
  }> {
    this.log("======== SearchUtils: deploy started ========");

    const owner = this.signers[0];

    this.log("deploying verifier...");
    const SearchUtilsFactory = await ethers.getContractFactory("SearchUtils");
    const searchUtils = await SearchUtilsFactory.deploy(stateContract.address);
    await searchUtils.deployed();
    this.log(`Search utils deployed to address ${searchUtils.address} from ${owner.address}`);

    return {
      searchUtils,
    };
  }

  private writeFile(fileName: string, data: any): void {
    fs.writeFileSync(fileName, toJson(data));
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}
