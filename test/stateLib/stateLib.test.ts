import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";
import { addStateToStateLib } from "../utils/state-utils";

const id1Inputs = [
  { id: 1, state: 10 },
  { id: 1, state: 20 },
];

describe("Negative tests", function () {
  let stateLibWrpr;

  before(async () => {
    const deployHelper = await DeployHelper.initialize();
    stateLibWrpr = await deployHelper.deployStateLibTestWrapper();

    for (const { id, state } of id1Inputs) {
      await addStateToStateLib(stateLibWrpr, id, state);
    }
  });

  it("getStateInfoByID: should be reverted if identity does not exist", async () => {
    const missingID = 777;

    await expect(stateLibWrpr.getStateInfoById(missingID)).to.be.revertedWith(
      "Identity does not exist"
    );
  });

  it("getStateInfoHistoryById: should be reverted if identity does not exist", async () => {
    const missingID = 777;

    await expect(stateLibWrpr.getStateInfoHistoryById(missingID, 0, 1)).to.be.revertedWith(
      "Identity does not exist"
    );
  });

  it("getStateInfoHistoryLengthById: should be reverted if identity does not exist", async () => {
    const missingID = 777;

    await expect(stateLibWrpr.getStateInfoHistoryLengthById(missingID)).to.be.revertedWith(
      "Identity does not exist"
    );
  });

  it("getStateInfoByIdAndState: should be reverted if state does not exist", async () => {
    const id = id1Inputs[0].id;
    const missingState = 888;

    await expect(stateLibWrpr.getStateInfoByIdAndState(id, missingState)).to.be.revertedWith(
      "State does not exist"
    );
  });

  it("Zero timestamp and block should be only in the first identity state", async () => {
    await expect(stateLibWrpr.addGenesisState(2, 20)).to.be.not.reverted;
    await expect(stateLibWrpr.addGenesisState(2, 20)).to.be.revertedWith(
      "Zero timestamp and block should be only in the first identity state"
    );

    await expect(stateLibWrpr.addState(3, 30)).to.be.not.reverted;
    await expect(stateLibWrpr.addGenesisState(3, 30)).to.be.revertedWith(
      "Zero timestamp and block should be only in the first identity state"
    );
  });
});

describe("StateInfo history", function () {
  let stateLibWrpr, id1, id1HistoryLength;
  let addStateResults: { [key: string]: any }[] = [];

  before(async () => {
    const deployHelper = await DeployHelper.initialize();
    stateLibWrpr = await deployHelper.deployStateLibTestWrapper();

    addStateResults = [];
    for (const { id, state } of id1Inputs) {
      addStateResults.push(await addStateToStateLib(stateLibWrpr, id, state));
    }
    id1 = id1Inputs[0].id;

    id1HistoryLength = await stateLibWrpr.getStateInfoHistoryLengthById(id1);
  });

  it("should return state history", async () => {
    expect(id1HistoryLength).to.be.equal(id1Inputs.length);

    const stateInfos = await stateLibWrpr.getStateInfoHistoryById(id1, 0, id1Inputs.length);
    expect(stateInfos.length).to.be.equal(id1Inputs.length);

    let [stateInfo] = await stateLibWrpr.getStateInfoHistoryById(id1, 0, 1);
    expect(stateInfo.id).to.be.equal(id1);
    expect(stateInfo.state).to.be.equal(addStateResults[0].stateInfoById.state);
    expect(stateInfo.replacedByState).to.be.equal(addStateResults[1].stateInfoById.state);
    expect(stateInfo.createdAtTimestamp).to.be.equal(addStateResults[0].timestamp);
    expect(stateInfo.replacedAtTimestamp).to.be.equal(addStateResults[1].timestamp);
    expect(stateInfo.createdAtBlock).to.be.equal(addStateResults[0].blockNumber);
    expect(stateInfo.replacedAtBlock).to.be.equal(addStateResults[1].blockNumber);

    [stateInfo] = await stateLibWrpr.getStateInfoHistoryById(id1, 1, 1);
    expect(stateInfo.id).to.be.equal(id1);
    expect(stateInfo.state).to.be.equal(addStateResults[1].stateInfoById.state);
    expect(stateInfo.replacedByState).to.be.equal(0);
    expect(stateInfo.createdAtTimestamp).to.be.equal(addStateResults[1].timestamp);
    expect(stateInfo.replacedAtTimestamp).to.be.equal(0);
    expect(stateInfo.createdAtBlock).to.be.equal(addStateResults[1].blockNumber);
    expect(stateInfo.replacedAtBlock).to.be.equal(0);
  });

  it("should be reverted if length is zero", async () => {
    await expect(stateLibWrpr.getStateInfoHistoryById(id1, 0, 0)).to.be.revertedWith(
      "Length should be greater than 0"
    );
  });

  it("should be reverted if length limit exceeded", async () => {
    await expect(stateLibWrpr.getStateInfoHistoryById(id1, 0, 10 ** 6)).to.be.revertedWith(
      "Length limit exceeded"
    );
  });

  it("should be reverted if startIndex is out of bounds", async () => {
    await expect(
      stateLibWrpr.getStateInfoHistoryById(id1, id1HistoryLength, 100)
    ).to.be.revertedWith("Start index out of bounds");
  });

  it("should not revert if startIndex + length >= historyLength", async () => {
    let history = await stateLibWrpr.getStateInfoHistoryById(id1, id1HistoryLength - 1, 100);
    expect(history.length).to.be.equal(1);
    history = await stateLibWrpr.getStateInfoHistoryById(id1, id1HistoryLength - 2, 100);
    expect(history.length).to.be.equal(2);
  });
});

describe("State history duplicates", function () {
  let stateLibWrpr;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    stateLibWrpr = await deployHelper.deployStateLibTestWrapper();
  });

  it("comprehensive check", async () => {
    const idAndStatesToAdd = [
      { id: 1, state: 1, noTime: true },
      { id: 1, state: 2 }, // singleState
      { id: 1, state: 1 }, // doubleState
      { id: 2, state: 1, noTime: true },
      { id: 2, state: 1 },
      { id: 2, state: 1 }, // tripleState
    ];

    const addResults: { [key: string]: any }[] = [];
    for (const { id, state, noTime } of idAndStatesToAdd) {
      addResults.push(await addStateToStateLib(stateLibWrpr, id, state, noTime));
    }

    const singleIdAndState = [1, 2];
    const doubleIdAndState = [1, 1];
    const tripleIdAndState = [2, 1];
    const nonExistingIdAndState1 = [1, 10];
    const nonExistingIdAndState2 = [10, 100];

    expect(await stateLibWrpr.getStateInfoListLengthByIdAndState(...singleIdAndState)).to.be.equal(
      1
    );
    expect(await stateLibWrpr.getStateInfoListLengthByIdAndState(...doubleIdAndState)).to.be.equal(
      2
    );
    expect(await stateLibWrpr.getStateInfoListLengthByIdAndState(...tripleIdAndState)).to.be.equal(
      3
    );
    expect(
      await stateLibWrpr.getStateInfoListLengthByIdAndState(...nonExistingIdAndState1)
    ).to.be.equal(0);
    expect(
      await stateLibWrpr.getStateInfoListLengthByIdAndState(...nonExistingIdAndState2)
    ).to.be.equal(0);

    const siSingleIdAndState = await stateLibWrpr.getStateInfoListByIdAndState(
      ...singleIdAndState,
      0,
      100
    );
    const siDoubleIdAndState = await stateLibWrpr.getStateInfoListByIdAndState(
      ...doubleIdAndState,
      0,
      100
    );
    const siTripleIdAndState = await stateLibWrpr.getStateInfoListByIdAndState(
      ...tripleIdAndState,
      0,
      100
    );

    expect(siSingleIdAndState.length).to.be.equal(1);
    expect(siDoubleIdAndState.length).to.be.equal(2);
    expect(siTripleIdAndState.length).to.be.equal(3);

    const checkStateInfo = (si: any, siExp: any, siExpNext: any) => {
      expect(si.id).to.be.equal(siExp.stateInfoById.id);
      expect(si.state).to.be.equal(siExp.stateInfoById.state);
      expect(si.replacedByState).to.be.equal(siExpNext.stateInfoById.state ?? 0);
      expect(si.createdAtTimestamp).to.be.equal(siExp.stateInfoById.createdAtTimestamp);
      expect(si.replacedAtTimestamp).to.be.equal(siExpNext.stateInfoById.createdAtTimestamp ?? 0);
      expect(si.createdAtBlock).to.be.equal(siExp.stateInfoById.createdAtBlock);
      expect(si.replacedAtBlock).to.be.equal(siExpNext.stateInfoById.createdAtBlock ?? 0);

      expect(si.id).to.be.equal(siExp.stateInfoByIdAndState.id);
      expect(si.state).to.be.equal(siExp.stateInfoByIdAndState.state);
      expect(si.replacedByState).to.be.equal(siExpNext.stateInfoByIdAndState.state ?? 0);
      expect(si.createdAtTimestamp).to.be.equal(siExp.stateInfoByIdAndState.createdAtTimestamp);
      expect(si.replacedAtTimestamp).to.be.equal(
        siExpNext.stateInfoByIdAndState.createdAtTimestamp ?? 0
      );
      expect(si.createdAtBlock).to.be.equal(siExp.stateInfoByIdAndState.createdAtBlock);
      expect(si.replacedAtBlock).to.be.equal(siExpNext.stateInfoByIdAndState.createdAtBlock ?? 0);
    };

    // check that state returned by getStateInfoListByIdAndState
    // is consistent with getStateInfoById and getStateInfoByIdAndState
    checkStateInfo(siSingleIdAndState[0], addResults[1], addResults[2]);
    checkStateInfo(siDoubleIdAndState[0], addResults[0], addResults[1]);
    checkStateInfo(siDoubleIdAndState[1], addResults[2], {
      stateInfoById: {},
      stateInfoByIdAndState: {},
    });
    checkStateInfo(siTripleIdAndState[0], addResults[3], addResults[4]);
    checkStateInfo(siTripleIdAndState[1], addResults[4], addResults[5]);
    checkStateInfo(siTripleIdAndState[2], addResults[5], {
      stateInfoById: {},
      stateInfoByIdAndState: {},
    });
  });

  it("should revert if length is zero", async () => {
    const id = 1;
    const state = 1;
    await stateLibWrpr.addState(id, state);
    await expect(stateLibWrpr.getStateInfoListByIdAndState(id, state, 0, 0)).to.be.revertedWith(
      "Length should be greater than 0"
    );
  });

  it("should revert if length limit exceeded", async () => {
    const id = 1;
    const state = 1;
    await stateLibWrpr.addState(id, state);
    await expect(
      stateLibWrpr.getStateInfoListByIdAndState(id, state, 0, 10 ** 6)
    ).to.be.revertedWith("Length limit exceeded");
  });

  it("should revert if out of bounds", async () => {
    const id = 1;
    const state = 1;
    await stateLibWrpr.addState(id, state);
    await stateLibWrpr.addState(id, state);
    await stateLibWrpr.addState(id, state);
    await expect(stateLibWrpr.getStateInfoListByIdAndState(id, state, 3, 100)).to.be.revertedWith(
      "Start index out of bounds"
    );

    it("should NOT revert if startIndex + length >= historyLength", async () => {
      const id = 1;
      const state = 1;
      await stateLibWrpr.addState(id, state);
      await stateLibWrpr.addState(id, state);
      await stateLibWrpr.addState(id, state);
      // take last 1 state info
      let list = await stateLibWrpr.getStateInfoListByIdAndState(id, state, 2, 100);
      expect(list.length).to.be.equal(1);
      // take last 2 state infos
      list = await stateLibWrpr.getStateInfoListByIdAndState(id, state, 1, 100);
      expect(list.length).to.be.equal(2);
    });
  });
});
