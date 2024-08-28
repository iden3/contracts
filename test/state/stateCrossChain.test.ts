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

describe("State Cross Chain", function () {
  let stateCrossChain, oracleProofValidator: Contract;
  const oracleProofValidatorStub = "OracleProofValidatorStub";

  before(async function () {
    const deployHelper = await DeployHelper.initialize(null, true);
    oracleProofValidator = await deployHelper.deployOracleProofValidator(oracleProofValidatorStub);
    const { state } = await deployHelper.deployState();

    stateCrossChain = await deployHelper.deployStateCrossChain(
      await oracleProofValidator.getAddress(),
      await state.getAddress(),
    );
  });

  it("Should process the message", async function () {
    let ism: IdentityStateMessage = {
      timestamp: 1724229639n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    let gsm: GlobalStateMessage = {
      timestamp: 1724339709n,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 0n,
    };

    let isu: StateUpdate = {
      idStateMsg: ism,
      signature: "0x",
    };

    let gsu: GlobalStateUpdate = {
      globalStateMsg: gsm,
      signature: "0x",
    };

    let crossChainProof = packCrossChainProofs([
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

    // result should be equal to timestamp from oracle as far as replacedAtTimestamp is zero in the messages
    let gsmReplacedAt = await stateCrossChain.getGistRootReplacedAt(gsm.idType, gsm.root);
    expect(gsmReplacedAt).to.equal(gsm.timestamp);
    let ismReplacedAt = await stateCrossChain.getStateReplacedAt(ism.id, ism.state);
    expect(ismReplacedAt).to.equal(ism.timestamp);

    ism = {
      timestamp: 1724229639n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 100n,
    };

    gsm = {
      timestamp: 1724339709n,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 100n,
    };

    isu = {
      idStateMsg: ism,
      signature: "0x",
    };

    gsu = {
      globalStateMsg: gsm,
      signature: "0x",
    };

    crossChainProof = packCrossChainProofs([
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

    // result should be equal replacedAtTimestamp in the messages
    gsmReplacedAt = await stateCrossChain.getGistRootReplacedAt(gsm.idType, gsm.root);
    expect(gsmReplacedAt).to.equal(gsm.replacedAtTimestamp);
    ismReplacedAt = await stateCrossChain.getStateReplacedAt(ism.id, ism.state);
    expect(ismReplacedAt).to.equal(ism.replacedAtTimestamp);
  });
});
