import { DeployHelper } from "./DeployHelper";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, Wallet, Block } from "ethers";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ContractMigrationSteps, EventLogEntry, log } from "./ContractMigrationSteps";
import { ethers } from "hardhat";

export class UniversalVerifierContractMigrationHelper extends ContractMigrationSteps {
  constructor(
    private readonly _universalVerifierDeployHelper: DeployHelper,
    protected readonly _signer: SignerWithAddress | Wallet,
  ) {
    super(_signer);
  }

  @log
  async getDataFromContract(contract: Contract, ...args: any[]): Promise<any> {
    const countRequests = await contract.getZKPRequestsCount();
    const stateAddress = await contract.getStateAddress();

    const result = { countRequests, stateAddress };
    return result;
  }

  @log
  async getDataFirstRequestFromContract(contract: Contract): Promise<any> {
    let validator: string = "";
    let request: any = {};

    const countRequests = await contract.getZKPRequestsCount();

    if (countRequests > 0) {
      const filter = contract.filters.ZKPRequestSet;
      let allEvents: any[];

      try {
        allEvents = (await contract.queryFilter(filter, 0, "latest")) as any;
      } catch (error) {
        // In case of large number of events some nodes protect with limit, we can use the following code to get events in chunks
        const startBlock = 0;
        const endBlock = ((await ethers.provider.getBlock("latest")) as Block).number;
        allEvents = [];

        console.log(
          `Getting events ZKPRequestSet from block ${endBlock} to ${startBlock} for first ZKPRequestSet`,
        );
        for (let i = endBlock; i > startBlock; i -= 5000) {
          const _startBlock = Math.max(0, i - 4999);
          const _endBlock = i;
          const events = await contract.queryFilter(filter, _startBlock, _endBlock);
          console.log(`Got ${events.length} events from block ${_startBlock} to ${_endBlock}`);
          if (events.length > 0) {
            allEvents.push(...events);
            // we need only 1 event
            break;
          }
        }
      }

      console.log(`Got ${allEvents.length} events in total`);

      const firstRequestInfo: any = await contract.getZKPRequest(allEvents[0].args.requestId);
      validator = firstRequestInfo[1];
      request = JSON.parse(firstRequestInfo[0]);
    }

    const result = { request, validator, countRequests };
    return result;
  }

  @log
  checkData(...args: any[]): any {
    const result1 = args[0];
    const result2 = args[1];

    const { countRequests: countRequestsV1, stateAddress: stateAddress1 } = result1;
    const { countRequests: countRequestsV2, stateAddress: stateAddress2 } = result2;
    console.assert(countRequestsV1 === countRequestsV2, "lenght of requests not equal");
    console.assert(stateAddress1 === stateAddress2, "state address not equal");
  }

  @log
  async populateData(contract: Contract, stateTransitionPayload: any[]): Promise<void> {}

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
  async upgradeContract(
    universalVerifierContract: Contract,
    opts: { verifierLibAddress: string },
  ): Promise<any> {
    return await this._universalVerifierDeployHelper.upgradeUniversalVerifier(
      await universalVerifierContract.getAddress(),
      opts.verifierLibAddress,
    );
  }
}
