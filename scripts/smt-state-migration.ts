import { ethers, upgrades } from "hardhat";

export class SmtStateMigration {
  static async getStateTransitionHistory(stateContract: any): Promise<any[]> {
    const filter = stateContract.filters.StateUpdated(null, null, null, null);
    const stateHistory = await stateContract.queryFilter(filter);
    return stateHistory;
  }

  static async migrate(smt: any, stateHistory: any[]): Promise<void> {
    for (let index = 0; index < stateHistory.length; index++) {
      const [id, block, timestamp, state] = stateHistory[index].args;
      await smt.addHistorical(id, state, timestamp, block);
    }
  }

  static async upgradeState(existingStateAddress: any) {
    const stateFactory = await ethers.getContractFactory("State");
    await upgrades.upgradeProxy(existingStateAddress, stateFactory);
    const stateContract = stateFactory.attach(existingStateAddress);
    return stateContract;
  }
}
