import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { deployContracts, publishState } from "../mtp/utils";

const testCases = [
  {
    name: "SMT Proxy upgrade test",
    issuerStateTransitions: [
      require("../mtp/data/issuer_state_transition.json"),
      require("../mtp/data/issuer_next_state_transition.json"),
    ],
  },
];

describe("State SMT proxy test", function () {
  let state: any, smt: any;

  beforeEach(async () => {
    const contracts = await deployContracts();
    state = contracts.state;
    smt = contracts.smt;
  });

  for (const test of testCases) {
    it(test.name, async () => {
      for (const issuerStateJson of test.issuerStateTransitions) {
        await publishState(state, issuerStateJson);
      }

      const rootHistory = await smt.getRootHistory();
      console.log(rootHistory);
      expect(rootHistory.length).to.equal(2);
      const maxDepth = await smt.getMaxDepth();
      console.log(maxDepth);
      expect(maxDepth).to.equal(32);
      // upgrade smt by proxy
      const smtV2Factory = await ethers.getContractFactory("SmtMock");
      console.log(`smt address :  ${smt.address}`);

      const tx = await upgrades.upgradeProxy(smt.address, smtV2Factory);

      console.log("upgrade successfully");
      console.log(tx.deployTransaction);

      const smtV2Contract = smtV2Factory.attach(smt.address);
      const maxDepthV2 = await smtV2Contract.getMaxDepth();
      expect(maxDepthV2).to.equal(64);

      await smtV2Contract.setTestMapValue(1, 2022);

      const value = await smtV2Contract.getTestMapValueById(1);
      expect(value).to.equal(2022);

      const rootHistoryV2 = await smtV2Contract.getRootHistory();
      expect(rootHistoryV2.length).to.equal(2);

      expect(rootHistory).deep.equal(rootHistoryV2);
    });
  }
});
