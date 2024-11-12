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

    let validator: string = "";
    let request: any = {};

    if (countRequests > 0) {
      const firstRequestInfo: any = await contract.getZKPRequest(0);
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

    const { request: requestV1, countRequests: countRequestsV1, validator: validatorV1 } = result1;
    const { request: requestV2, countRequests: countRequestsV2, validator: validatorV2 } = result2;
    console.assert(countRequestsV1 === countRequestsV2, "lenght of requests not equal");
    console.assert(JSON.stringify(requestV1) === JSON.stringify(requestV2), "requests not equal");
    console.assert(validatorV1 === validatorV2, "validator not equal");
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
