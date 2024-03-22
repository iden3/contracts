import { expect } from "chai";
import { ethers } from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";

const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
const verifierStubContractName = "VerifierStub";
const stateContractName = "State";
const stateContractAddress = "0x134B1BE34911E39A8397ec6289782989729807a4";
const proxyAdminContractAddress = "0x09bCEf4386D6c19BDb24a85e5C60adEc6921701a";

const proxyAdminABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

describe.skip("State upgrade test", function () {
  it("Should upgrade State contract with data consistency", async () => {
    const state = await ethers.getContractAt(stateContractName, stateContractAddress);

    const stateHistoryLengthBefore = await state.getStateInfoHistoryLengthById(id);
    const stateInfosBefore = await state.getStateInfoHistoryById(id, 0, stateHistoryLengthBefore);
    const defaultIdTypeBefore = await state.getDefaultIdType();

    const proxyAdminContract = await ethers.getContractAt(proxyAdminABI, proxyAdminContractAddress);
    const proxyAdminOwner = await proxyAdminContract.owner();
    const imProxyAdminOwner = await ethers.getImpersonatedSigner(proxyAdminOwner);

    const stateOwnerAddressBefore = await state.owner();
    const imStateOwner = await ethers.getImpersonatedSigner(stateOwnerAddressBefore);


    // **** Upgrade State ****
    const deployHelper = await DeployHelper.initialize([imProxyAdminOwner, imStateOwner]);
    await deployHelper.upgradeState(state.address);
    // ************************


    const stateHistoryLengthAfter = await state.getStateInfoHistoryLengthById(id);
    const stateInfosAfter = await state.getStateInfoHistoryById(id, 0, stateHistoryLengthBefore);
    const stateOwnerAddressAfter = await state.owner();

    expect(stateHistoryLengthAfter).to.equal(stateHistoryLengthBefore);
    expect(stateInfosAfter).to.deep.equal(stateInfosBefore);
    expect(stateOwnerAddressAfter).to.equal(stateOwnerAddressBefore);

    const defaultIdType = await state.connect(imStateOwner).getDefaultIdType();
    expect(defaultIdType).to.equal(defaultIdTypeBefore);


    // **** Additional write-read tests ****
    const verifierStub = await ethers.deployContract(verifierStubContractName);
    await state.connect(imStateOwner).setVerifier(verifierStub.address);
    const oldStateInfo = await state.getStateInfoById(id);

    const newState = 12345;
    await expect(
      state.transitState(
        id,
        oldStateInfo.state,
        newState,
        false,
        [0, 0],
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0]
      )
    ).not.to.be.reverted;

    const newStateInfo = await state.getStateInfoById(id);
    expect(newStateInfo.state).to.equal(newState);
    const stateHistoryLength = await state.getStateInfoHistoryLengthById(id);
    expect(stateHistoryLength).to.equal(stateHistoryLengthAfter.add(1));
    // **********************************

  });
});
