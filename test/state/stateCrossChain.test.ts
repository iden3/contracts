import {
  GlobalStateMessage,
  GlobalStateUpdate,
  IdentityStateMessage,
  packCrossChainProofs,
  packGlobalStateUpdate,
  packIdentityStateUpdate,
  StateUpdate,
} from "../utils/packData";
import { expect } from "chai";
import { DataLocation, DeployHelper } from "../../helpers/DeployHelper";
import { Contract } from "ethers";
import { ethers } from "hardhat";

async function processCrossChainProofAndGetTimestamps(
  ism: IdentityStateMessage,
  gsm: GlobalStateMessage,
  stateCrossChainWrapper: Contract,
): Promise<{
  gistRootReplacedAt: bigint;
  stateReplacedAt: bigint;
  nonExistentGistRootReplacedAt: bigint;
  nonExistentStateReplacedAt: bigint;
}> {
  const isu: StateUpdate = {
    idStateMsg: ism,
    signature: "0x",
  };

  const gsu: GlobalStateUpdate = {
    globalStateMsg: gsm,
    signature: "0x",
  };

  const crossChainProof = packCrossChainProofs([
    {
      proofType: "globalStateProof",
      proof: packGlobalStateUpdate(gsu),
    },
    {
      proofType: "stateProof",
      proof: packIdentityStateUpdate(isu),
    },
  ]);

  const tx = await stateCrossChainWrapper.processProofAndEmitInfo(
    crossChainProof,
    gsm.idType,
    gsm.root,
    ism.id,
    ism.state,
  );
  const receipt = await tx.wait();

  return {
    gistRootReplacedAt: receipt.logs[0].args[0],
    stateReplacedAt: receipt.logs[0].args[1],
    nonExistentGistRootReplacedAt: receipt.logs[1].args[0],
    nonExistentStateReplacedAt: receipt.logs[1].args[1],
  };
}

describe("State Cross Chain", function () {
  let stateCrossChainWrapper, stateCrossChain, oracleProofValidator, stateStub: Contract;
  const oracleProofValidatorStub = "OracleProofValidatorStub";
  const stateWithTimestampGettersStub = "StateWithTimestampGettersStub";

  beforeEach(async function () {
    const deployHelper = await DeployHelper.initialize(null, true);
    stateStub = await ethers.deployContract(stateWithTimestampGettersStub);
    oracleProofValidator = await deployHelper.deployOracleProofValidator(oracleProofValidatorStub);

    // TODO check both Storage and TransientStorage and use fixtures
    stateCrossChain = await deployHelper.deployStateCrossChain(
      await oracleProofValidator.getAddress(),
      await stateStub.getAddress(),
      DataLocation.TransientStorage,
    );

    stateCrossChainWrapper = await ethers.deployContract("StateCrossChainWrapper", [
      await stateCrossChain.getAddress(),
    ]);
  });

  it("Should process the messages without replacedAtTimestamp", async function () {
    const ism: IdentityStateMessage = {
      timestamp: 1724229639n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: 1724339709n,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 0n,
    };

    const { gistRootReplacedAt, stateReplacedAt } = await processCrossChainProofAndGetTimestamps(
      ism,
      gsm,
      stateCrossChainWrapper,
    );

    // result should be equal to timestamp from oracle as far as replacedAtTimestamp is zero in the messages
    expect(gistRootReplacedAt).to.equal(gsm.timestamp);
    expect(stateReplacedAt).to.equal(ism.timestamp);
  });

  it("Should process the messages with replacedAtTimestamp", async function () {
    const ism: IdentityStateMessage = {
      timestamp: 1724229639n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 100n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: 1724339709n,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 100n,
    };

    const { gistRootReplacedAt, stateReplacedAt } = await processCrossChainProofAndGetTimestamps(
      ism,
      gsm,
      stateCrossChainWrapper,
    );

    expect(gistRootReplacedAt).to.equal(gsm.replacedAtTimestamp);
    expect(stateReplacedAt).to.equal(ism.replacedAtTimestamp);
  });

  it("Should return zero from the State stub if requested for a non-existent data", async function () {
    const ism: IdentityStateMessage = {
      timestamp: 1724229639n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 100n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: 1724339709n,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 100n,
    };

    const { nonExistentGistRootReplacedAt, nonExistentStateReplacedAt } =
      await processCrossChainProofAndGetTimestamps(ism, gsm, stateCrossChainWrapper);

    expect(nonExistentGistRootReplacedAt).to.equal(0);
    expect(nonExistentStateReplacedAt).to.equal(0);
  });

  it("Should return correct supported idType", async function () {
    // checking if crosschain just redirects the call to the state
    const id = 25061242388220042378440625585145526395156084635704446088069097186261377537n;
    const idType = await stateCrossChain.getIdTypeIfSupported(id);
    const expectedIdType = await stateStub.getIdTypeIfSupported(id);
    expect(idType).to.equal(expectedIdType);
  });
});
