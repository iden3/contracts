import { expect } from "chai";
import { ethers } from "hardhat";
import { publishState } from "./../utils/deploy-utils";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";

const issuerStateTransitions = [
  require("../mtp/data/issuer_state_transition.json"),
  require("../mtp/data/issuer_next_state_transition.json"),
];

describe("Search utils", () => {
  let state: any;
  let searchUtils: any;

  beforeEach(async () => {
    const deployHelper = await StateDeployHelper.initialize();
    const contracts = await deployHelper.deployStateV2();
    const utils = await deployHelper.deploySearchUtils(contracts.state);

    state = contracts.state;
    searchUtils = utils.searchUtils;
  });

  it("should be correct search", async () => {
    const currentRoots: any[] = [];
    const id = ethers.BigNumber.from(issuerStateTransitions[0].pub_signals[0]);

    for (const issuerStateJson of issuerStateTransitions) {
      await publishState(state, issuerStateJson);
    }
    const states = await state.getAllStatesById(id);
    expect(states.length).to.equal(issuerStateTransitions.length + 1); // + 1 because of genesis state

    const latestState = await state.getState(id);
    const latestStateInfo = await state.getTransitionInfo(latestState);

    const searchRes = await searchUtils.getStateDataByBlock(
      id, latestStateInfo.createdAtBlock
    );
    expect(JSON.stringify(latestStateInfo)).to.equal(JSON.stringify(searchRes));


    const previousStateInfo = await state.getTransitionInfo(states[states.length - 2]);

    const searchRes2 = await searchUtils.getStateDataByBlock(
        id,
        previousStateInfo.createdAtBlock
    );

    expect(JSON.stringify(previousStateInfo)).to.equal(
      JSON.stringify(searchRes2)
    );


    const searchRes3 = await searchUtils.getStateDataByTime(
        id,
        latestStateInfo.createdAtTimestamp
    );

    expect(JSON.stringify(latestStateInfo)).to.equal(
        JSON.stringify(searchRes3)
    );


    const searchRes4 = await searchUtils.getStateDataByTime(
        id,
        previousStateInfo.createdAtTimestamp
    );

    expect(JSON.stringify(previousStateInfo)).to.equal(
        JSON.stringify(searchRes4)
    );

  });
});
