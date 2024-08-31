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
import { DeployHelper } from "../../helpers/DeployHelper";
import { Contract } from "ethers";
import { ethers } from "hardhat";

async function processMessages(
  ism: IdentityStateMessage,
  gsm: GlobalStateMessage,
  stateCrossChain,
) {
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

  await expect(stateCrossChain.processProof(crossChainProof)).not.to.be.rejected;
}

describe("State Cross Chain", function () {
  let stateCrossChain, oracleProofValidator, stateStub: Contract;
  let ism: IdentityStateMessage;
  let gsm: GlobalStateMessage;
  const oracleProofValidatorStub = "OracleProofValidatorStub";
  const stateWithTimestampGettersStub = "StateWithTimestampGettersStub";

  beforeEach(async function () {
    const deployHelper = await DeployHelper.initialize(null, true);
    oracleProofValidator = await deployHelper.deployOracleProofValidator(oracleProofValidatorStub);
    stateStub = await ethers.deployContract(stateWithTimestampGettersStub);

    stateCrossChain = await deployHelper.deployStateCrossChain(
      await oracleProofValidator.getAddress(),
      await stateStub.getAddress(),
    );
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

    await processMessages(ism, gsm, stateCrossChain);

    // result should be equal to timestamp from oracle as far as replacedAtTimestamp is zero in the messages
    const gsmReplacedAt = await stateCrossChain.getGistRootReplacedAt(gsm.idType, gsm.root);
    expect(gsmReplacedAt).to.equal(gsm.timestamp);
    const ismReplacedAt = await stateCrossChain.getStateReplacedAt(ism.id, ism.state);
    expect(ismReplacedAt).to.equal(ism.timestamp);
  });

  it.only("Should process the messages with replacedAtTimestamp", async function () {
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

    await processMessages(ism, gsm, stateCrossChain);

    // result should be equal replacedAtTimestamp in the messages
    const gsmReplacedAt = await stateCrossChain.getGistRootReplacedAt(gsm.idType, gsm.root);
    expect(gsmReplacedAt).to.equal(gsm.replacedAtTimestamp);
    const gsmReplacedAt2 = await stateCrossChain.getGistRootReplacedAt2(gsm.idType, gsm.root);
    expect(gsmReplacedAt2).to.equal(gsm.replacedAtTimestamp);

    const ismReplacedAt = await stateCrossChain.getStateReplacedAt(ism.id, ism.state);
    expect(ismReplacedAt).to.equal(ism.replacedAtTimestamp);
    const ismReplacedAt2 = await stateCrossChain.getStateReplacedAt2(ism.id, ism.state);
    expect(ismReplacedAt2).to.equal(ism.replacedAtTimestamp);
  });

  it("Should return zero from the State stub if requested for a non-existent data", async function () {
    const gsmReplacedAt = await stateCrossChain.getGistRootReplacedAt("0x0102", 10);
    expect(gsmReplacedAt).to.equal(0);
    const ismReplacedAt = await stateCrossChain.getStateReplacedAt(10, 20);
    expect(ismReplacedAt).to.equal(0);
  });

  it("Should return correct supported idType", async function () {
    // checking if crosschain just redirects the call to the state
    const id = 25061242388220042378440625585145526395156084635704446088069097186261377537n;
    const idType = await stateCrossChain.getIdTypeIfSupported(id);
    const expectedIdType = await stateStub.getIdTypeIfSupported(id);
    expect(idType).to.equal(expectedIdType);
  });
});
