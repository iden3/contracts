import { DeployHelper } from "./DeployHelper";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, Wallet } from "ethers";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ContractMigrationSteps, EventLogEntry, log } from "./ContractMigrationSteps";
import { ethers } from "hardhat";

export class StateContractMigrationHelper extends ContractMigrationSteps {
  constructor(
    private readonly _stateDeployHelper: DeployHelper,
    protected readonly _signer: SignerWithAddress | Wallet
  ) {
    super(_signer);
  }

  @log
  async getDataFromContract(contract: Contract, ...args: any[]): Promise<any> {
    const id = args[0];
    const state = args[1];
    const stateInfoHistoryLengthById = await contract.getStateInfoHistoryLengthById(id);
    const latestStateInfoById = await contract.getStateInfoById(id);
    const stateInfoByIdAndState = await contract.getStateInfoByIdAndState(id, state);
    // const stateInfoHistory = await contract.getStateInfoHistoryById(id, 0, 3); //
    const root = await contract.getGISTRoot(); //
    const rootInfo = await contract.getGISTRootInfo(root);
    const gistProof = await contract.getGISTProof(id);
    const gistProofByRoot = await contract.getGISTProofByRoot(id, root); //

    const result = {
      stateInfoHistoryLengthById,
      latestStateInfoById,
      stateInfoByIdAndState,
      // stateInfoHistory,
      root,
      gistProof,
      rootInfo,
      gistProofByRoot,
    };

    return result;
  }

  @log
  async checkData(...args: any[]): Promise<any> {
    const result1 = args[0];
    const result2 = args[1];
    const {
      stateInfoHistoryLengthById: stateInfoHistoryLengthByIdV1,
      latestStateInfoById: latestStateInfoByIdV1,
      stateInfoByIdAndState: stateInfoByIdAndStateV1,
      // stateInfoHistory: stateInfoHistoryV1,
      root: rootV1,
      gistProof: gistProofV1,
      rootInfo: rootInfoV1,
      gistProofByRoot: gistProofByRootV1,
    } = result1;

    const {
      stateInfoHistoryLengthById: stateInfoHistoryLengthByIdV2,
      latestStateInfoById: latestStateInfoByIdV2,
      stateInfoByIdAndState: stateInfoByIdAndStateV2,
      // stateInfoHistory: stateInfoHistoryV2,
      root: rootV2,
      gistProof: gistProofV2,
      rootInfo: rootInfoV2,
      gistProofByRoot: gistProofByRootV2,
    } = result2;

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
    // console.assert(
    //   stateInfoHistoryV2.length === stateInfoHistoryV1.length && stateInfoHistoryV2.length !== 0,
    //   "stateInfoHistoryV2 length not equal"
    // );

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

  @log
  async populateData(contract: Contract, stateTransitionPayload: any[]): Promise<void> {
    for (let idx = 0; idx < stateTransitionPayload.length; idx++) {
      const state = stateTransitionPayload[idx];
      await this.publishState(contract, state);
    }
  }

  @log
  async getTxsFromEventDataByHash(eventLogs: EventLogEntry[], fileName = ""): Promise<any> {
    const txHashes: unknown[] = [];
    try {
      for (let idx = 0; idx < eventLogs.length; idx++) {
        const event = eventLogs[idx];
        console.log(`index: ${idx}, event.transactionHash: ${event.transactionHash}`);
        const tx = await this._signer.provider?.getTransaction(event.transactionHash);
        txHashes.push(tx);
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      if (fileName) {
        this.writeFile(fileName, txHashes);
      }
    }
    return txHashes;
  }

  @log
  async upgradeContract(contract: Contract): Promise<any> {
    return await this._stateDeployHelper.upgradeState(contract.address);
  }
  private async publishState(
    state: Contract,
    json: { [key: string]: string }
  ): Promise<{
    oldState: string;
    newState: string;
    id: string;
    blockNumber: number;
    timestamp: number;
  }> {
    const {
      inputs: [id, oldState, newState, isOldStateGenesis],
      pi_a,
      pi_b,
      pi_c,
    } = this.prepareInputs(json);

    const transitStateTx = await state.transitState(
      id,
      oldState,
      newState,
      isOldStateGenesis === "1",
      pi_a,
      pi_b,
      pi_c
    );

    const { blockNumber } = await transitStateTx.wait();
    const { timestamp } = await ethers.provider.getBlock(transitStateTx.blockNumber);

    return {
      oldState,
      newState,
      id,
      blockNumber,
      timestamp,
    };
  }
  private prepareInputs(json: any): any {
    const { proof, pub_signals } = json;
    const { pi_a, pi_b, pi_c } = proof;
    const [[p1, p2], [p3, p4]] = pi_b;
    const preparedProof = {
      pi_a: pi_a.slice(0, 2),
      pi_b: [
        [p2, p1],
        [p4, p3],
      ],
      pi_c: pi_c.slice(0, 2),
    };

    return { inputs: pub_signals, ...preparedProof };
  }
}
