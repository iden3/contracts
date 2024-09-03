import { DeployHelper } from "./DeployHelper";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, Wallet } from "ethers";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ContractMigrationSteps, EventLogEntry, log } from "./ContractMigrationSteps";

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
    const requests = await contract.getZKPRequests(0, countRequests);

    const requestsObj = requests.map((request: any) => JSON.parse(request[0]));

    const result = { requests: requestsObj };
    return result;
  }

  @log
  checkData(...args: any[]): any {
    const result1 = args[0];
    const result2 = args[1];

    const { requests: requestsV1 } = result1;
    const { requests: requestsV2 } = result2;
    console.assert(requestsV1.length === requestsV2.length, "lenght of requests not equal");
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
  async upgradeContract(universalVerifierContract: Contract): Promise<any> {
    return await this._universalVerifierDeployHelper.upgradeUniversalVerifier(
      await universalVerifierContract.getAddress(),
    );
  }
}
