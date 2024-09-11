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

async function processMessages(
  ism: IdentityStateMessage,
  gsm: GlobalStateMessage,
  stateCrossChain,
): Promise<string> {
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

  try {
    await stateCrossChain.processProof(crossChainProof);
  } catch (e: any) {
    return e.message;
  }

  return "";
}

describe("State Cross Chain", function () {
  let stateCrossChain, oracleProofValidatorStub: Contract;
  const oracleProofValidatorStubContract = "OracleProofValidatorStub";

  beforeEach(async function () {
    const deployHelper = await DeployHelper.initialize(null, true);
    oracleProofValidatorStub = await deployHelper.deployOracleProofValidator(
      oracleProofValidatorStubContract,
    );

    const { state } = await deployHelper.deployState(["0x01A1", "0x0102"]);
    await state.setOracleProofValidator(oracleProofValidatorStub);
    stateCrossChain = state;
  });

  it("Should process the messages without replacedAtTimestamp", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
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

  it("Should process the messages with replacedAtTimestamp", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const ism: IdentityStateMessage = {
      // current timestamp
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 100n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 100n,
    };

    await processMessages(ism, gsm, stateCrossChain);

    // result should be equal replacedAtTimestamp in the messages
    const gsmReplacedAt = await stateCrossChain.getGistRootReplacedAt(gsm.idType, gsm.root);
    expect(gsmReplacedAt).to.equal(gsm.replacedAtTimestamp);
    const ismReplacedAt = await stateCrossChain.getStateReplacedAt(ism.id, ism.state);
    expect(ismReplacedAt).to.equal(ism.replacedAtTimestamp);
  });

  it("Should return zero from the State if requested for a non-existent data", async function () {
    await expect(stateCrossChain.getGistRootReplacedAt("0x0102", 10)).to.be.rejectedWith(
      "Gist root entry not found",
    );
    await expect(stateCrossChain.getStateReplacedAt(10, 20)).to.be.rejectedWith(
      "State entry not found",
    );
  });

  it("Oracle timestamp should not be in the past", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp - 10n ** 6n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 0n,
    };

    const result = await processMessages(ism, gsm, stateCrossChain);
    expect(result).to.contain("Oracle timestamp cannot be in the past");
  });

  it("Oracle replacedAt or oracle timestamp cannot be in the future", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    let ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: currentTimestamp + 10n ** 6n,
    };

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: currentTimestamp + 10n ** 6n,
    };

    const result = await processMessages(ism, gsm, stateCrossChain);
    expect(result).to.contain("Oracle replacedAt or oracle timestamp cannot be in the future");

    ism = {
      timestamp: currentTimestamp + 10n ** 6n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    const result2 = await processMessages(ism, gsm, stateCrossChain);
    expect(result2).to.contain("Oracle replacedAt or oracle timestamp cannot be in the future");
  });
});
