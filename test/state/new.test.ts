import { expect } from "chai";
import { ethers } from "hardhat";
import { publishState, publishStateWithStubProof } from "../utils/state-utils";
import { DeployHelper } from "../../helpers/DeployHelper";
import bigInt from "big-integer";

const verifierStubName = "VerifierStub";

const stateTransitionsWithProofs = [
  require("./data/user_state_genesis_transition.json"),
  require("./data/user_state_next_transition.json"),
];

const stateTransitionsWithNoProofs = [
  {
    id: '6901746346790563787434755862277025452451108972170386555162524223864832',
    oldState: '1099511627776',
    newState: '2199023255552',
    isOldStateGenesis: true,
  },
  {
    id: '6901746346790563787434755862277025452451108972170386555162524223864832',
    oldState: '2199023255552',
    newState: '3298534883328',
    isOldStateGenesis: false,
  },
];

describe("StateInfo history", function () {
  it("should return state history", async () => {
    // Run on forked testnet/mainnet [TBD define the block number to start the fork]

    // Get state history length before + state infos before
    // Get owner before
    // Get default id type before

    // Upgrade contract

    // Get state history length after + state infos after
    // Get owner after
    // Get default id type after

    // Try to transit state via generic method?
    // Check the result via getter variables

    const deployHelper = await DeployHelper.initialize();

    let state = await ethers.getContractAt(
      "State",
      "0x134B1BE34911E39A8397ec6289782989729807a4"
    );

    const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
    const stateValue = "0x2c68da47bf4c9acb3320076513905f7b63d8070ed8276ad16ca5402b267a7c26";

    const stateHistoryLengthBefore = await state.getStateInfoHistoryLengthById(id);
    const stateInfosBefore = await state.getStateInfoHistoryById(id, 0, stateHistoryLengthBefore);

    console.log("stateHistoryLengthBefore", stateHistoryLengthBefore.toString());
    console.log("stateInfosBefore", stateInfosBefore);

    const ownerAddr = await state.owner();
    const impesonatedOwner = await ethers.getImpersonatedSigner(ownerAddr);
    await state.connect(impesonatedOwner).setDefaultIdType("0x0101");

    ({ state } = await deployHelper.upgradeState(
      state.address,
      impesonatedOwner
    ));

    const stateHistoryLengthAfter = await state.getStateInfoHistoryLengthById(id);
    const stateInfosAfter = await state.getStateInfoHistoryById(id, 0, stateHistoryLengthBefore);

    expect(stateHistoryLengthAfter).to.equal(stateHistoryLengthBefore);
    expect(stateInfosAfter).to.deep.equal(stateInfosBefore);

    const defaultIdType = await state.getDefaultIdType();
    expect(defaultIdType).to.equal("0x0101");

    // const [firstSigner] = await ethers.getSigners();
    await state.connect(impesonatedOwner).setDefaultIdType("0x0102");
    const defaultIdTypeAfter = await state.getDefaultIdType();
    expect(defaultIdTypeAfter).to.equal("0x0102");
  });
});
