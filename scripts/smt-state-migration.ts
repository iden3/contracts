export class SmtStateMigration {
  static async migrate(smt: any, stateHistory: any[]): Promise<void> {
    for (let index = 0; index < stateHistory.length; index++) {
      const [id, block, timestamp, state] = stateHistory[index].args;
      await smt.addHistorical(id, state, timestamp, block);
    }
  }
}
