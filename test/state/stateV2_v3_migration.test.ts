import { expect } from "chai";
import { ethers, network} from "hardhat";
import { publishState } from "../utils/state-utils";
import { DeployHelper } from "../../helpers/DeployHelper";
import bigInt from "big-integer";
import { StateContractMigrationHelper } from "../../helpers/StateContractMigrationHelper";
import { chainIdDefaultIdTypeMap } from "../../helpers/ChainIdDefTypeMap";

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

describe.skip("Get State old Contract and migrate to latest version", () => {
    let guWrpr;
    let deployHelper;
    let signers;

    before(async function () {
        signers = await ethers.getSigners();
        deployHelper = await DeployHelper.initialize();
        guWrpr = await deployHelper.deployGenesisUtilsWrapper();
  });

  it("Check migration", async () => {
    // 1. init old contract by abi & address
    const stateContractMigrationHelper = new StateContractMigrationHelper(deployHelper, signers[0]);
    const oldContractABI = [];  // abi of contract that will be upgraded
    const stateContractAddress = '';  // address of contract that will be upgraded
    const stateContractInstance = await stateContractMigrationHelper.getInitContract({
        contractNameOrAbi: oldContractABI,
        address: stateContractAddress,
    });

    // 2. publish first state
    const params1 = await publishState(stateContractInstance, stateTransitionsWithProofs[0]);
    const res1 = await stateContractInstance.getStateInfoById(params1.id);
    expect(res1.state).to.be.equal(bigInt(params1.newState).toString());

    // 3. migrate 
    const { state: stateV3 } = await stateContractMigrationHelper.upgradeContract(stateContractInstance);
  
    // 4. publish second state
    const params2 = await publishState(stateV3, stateTransitionsWithProofs[1]);
    const res2 = await stateV3.getStateInfoById(params2.id);
    expect(res2.state).to.be.equal(bigInt(params2.newState).toString());
  
    // 5. check _defaultIdType is not initialized
    await expect(stateV3.getDefaultIdType()).to.be.revertedWith(
      "Default Id Type is not initialized"
    );
    // 6. initialize _defaultIdType
    const { defaultIdType } = await deployHelper.getDefaultIdType();
    await stateV3.setDefaultIdType(defaultIdType);
    const defIdTypeValue = await stateV3.getDefaultIdType();
    expect(defaultIdType).to.be.equal(defIdTypeValue);
  
    // 7. run new 'transitStateGeneric' method
    const onchainId = await guWrpr.calcOnchainIdFromAddress(defaultIdType, signers[0].address); 
    await stateV3.transitStateGeneric(
      onchainId, 
      stateTransitionsWithNoProofs[0].oldState, 
      stateTransitionsWithNoProofs[0].newState,
      stateTransitionsWithNoProofs[0].isOldStateGenesis,
      1,
      []
    );

    const res3 = await stateV3.getStateInfoById(onchainId);
    expect(res3.state).to.be.equal(bigInt(stateTransitionsWithNoProofs[0].newState).toString());

  });
});