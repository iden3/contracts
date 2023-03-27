import { StateDeployHelper } from "../../helpers/StateDeployHelper";
import { addStateToStateLib } from "../utils/deploy-utils";
import { expect } from "chai";

const id1Inputs = [
  { id: 1, state: 10 },
  { id: 1, state: 20 },
];

describe("getStateInfo negative tests", function () {
  let stateLibWrpr;

  before(async () => {
    const deployHelper = await StateDeployHelper.initialize();
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

    await expect(
      stateLibWrpr.getStateInfoHistoryById(missingID, 0, 1)
    ).to.be.revertedWith("Identity does not exist");
  });

  it("getStateInfoHistoryLengthById: should be reverted if identity does not exist", async () => {
    const missingID = 777;

    await expect(
      stateLibWrpr.getStateInfoHistoryLengthById(missingID)
    ).to.be.revertedWith("Identity does not exist");
  });

  it("getStateInfoByIdAndState: should be reverted if state does not exist", async () => {
    const id = id1Inputs[0].id;
    const missingState = 888;

    await expect(stateLibWrpr.getStateInfoByIdAndState(id, missingState)).to.be.revertedWith(
      "State does not exist"
    );
  });
});

describe("StateInfo history", function () {
  let stateLibWrpr, id1, id1HistoryLength;
  let addStateResults: { [key: string]: string | number }[] = [];

  before(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    stateLibWrpr = await deployHelper.deployStateLibTestWrapper();

    addStateResults = [];
    for (const { id, state } of id1Inputs) {
      addStateResults.push(await addStateToStateLib(stateLibWrpr, id, state));
    }
    id1 = addStateResults[0].id;

    id1HistoryLength = await stateLibWrpr.getStateInfoHistoryLengthById(id1);
  });

  it("should return state history", async () => {
    expect(id1HistoryLength).to.be.equal(id1Inputs.length);

    const stateInfos = await stateLibWrpr.getStateInfoHistoryById(id1, 0, id1Inputs.length);
    expect(stateInfos.length).to.be.equal(id1Inputs.length);

    let [stateInfo] = await stateLibWrpr.getStateInfoHistoryById(id1, 0, 1);
    expect(stateInfo.id).to.be.equal(id1);
    expect(stateInfo.state).to.be.equal(addStateResults[0].state);
    expect(stateInfo.replacedByState).to.be.equal(addStateResults[1].state);
    expect(stateInfo.createdAtTimestamp).to.be.equal(addStateResults[0].timestamp);
    expect(stateInfo.replacedAtTimestamp).to.be.equal(addStateResults[1].timestamp);
    expect(stateInfo.createdAtBlock).to.be.equal(addStateResults[0].blockNumber);
    expect(stateInfo.replacedAtBlock).to.be.equal(addStateResults[1].blockNumber);

    [stateInfo] = await stateLibWrpr.getStateInfoHistoryById(id1, 1, 1);
    expect(stateInfo.id).to.be.equal(id1);
    expect(stateInfo.state).to.be.equal(addStateResults[1].state);
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
