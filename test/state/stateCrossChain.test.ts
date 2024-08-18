import { ethers } from "hardhat";
import { Contract } from "ethers";
import { GlobalStateUpdate, StateUpdate } from "../utils/packData";
import { DeployHelper } from "../../helpers/DeployHelper";
import {
  packCrossChainProofs,
  packIdentityStateUpdate,
  packGlobalStateUpdate,
} from "../utils/packData";
import { expect } from "chai";

describe("StateCrossChain test", function () {
  let stateCrossChain: Contract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();
    const deployHelper = await DeployHelper.initialize();

    ({ stateCrossChain } = await deployHelper.deployStateCrossChain("OracleProofValidatorStub"));
  });

  it("should be able to set state info", async function () {
    const su: StateUpdate = {
      idStateMsg: {
        from: await signer.getAddress(),
        timestamp: 20n,
        identity: 100n,
        state: 1000n,
        replacedByState: 1001n,
        createdAtTimestamp: 10n,
        replacedAtTimestamp: 0n,
      },
      signature: "0x",
    };

    const gsu: GlobalStateUpdate = {
      globalStateMsg: {
        from: await signer.getAddress(),
        timestamp: 20n,
        root: 100n,
        replacedByRoot: 101n,
        createdAtTimestamp: 10n,
        replacedAtTimestamp: 0n,
      },
      signature: "0x",
    };

    const crossChainProof = packCrossChainProofs([
      {
        proofType: "stateProof",
        proof: packIdentityStateUpdate(su),
      },
      {
        proofType: "globalStateProof",
        proof: packGlobalStateUpdate(gsu),
      },
    ]);

    await stateCrossChain.processProof(crossChainProof);

    const stateReplacedAt = await stateCrossChain.getReplacedAtOfState(
      su.idStateMsg.identity,
      su.idStateMsg.state,
    );
    expect(stateReplacedAt).to.be.equal(su.idStateMsg.timestamp);

    const globalStateReplacedAt = await stateCrossChain.getReplacedAtOfGistRoot(
      gsu.globalStateMsg.root,
    );
    expect(globalStateReplacedAt).to.be.equal(gsu.globalStateMsg.timestamp);
  });
});
