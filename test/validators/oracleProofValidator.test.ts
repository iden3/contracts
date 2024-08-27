import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import {
  GlobalStateUpdate,
  StateUpdate,
  IdentityStateMessage,
  GlobalStateMessage,
  packCrossChainProofs,
  packIdentityStateUpdate,
  packGlobalStateUpdate,
} from "../utils/packData";
import { DeployHelper } from "../../helpers/DeployHelper";

describe("Oracle Proof Validator", function () {
  let stateCrossChain, opv: Contract;
  let signer: Signer;
  let identityStateMessage: IdentityStateMessage;
  let globalStateMessage: GlobalStateMessage;
  let signatureISM, signatureGSM: string;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const deployHelper = await DeployHelper.initialize(null, true);

    const domainName = "StateInfo";
    const signatureVersion = "1";
    const chainId = 0;
    const verifyingContract = ethers.ZeroAddress;

    const domain = {
      name: domainName,
      version: signatureVersion,
      chainId,
      verifyingContract,
    };

    identityStateMessage = {
      timestamp: 1724229639n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    globalStateMessage = {
      timestamp: 1724339709n,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 0n,
    };

    const ismTypes = {
      IdentityState: [
        { name: "timestamp", type: "uint256" },
        { name: "id", type: "uint256" },
        { name: "state", type: "uint256" },
        { name: "replacedAtTimestamp", type: "uint256" },
      ],
    };

    const gsmTypes = {
      GlobalState: [
        { name: "timestamp", type: "uint256" },
        { name: "idType", type: "bytes2" },
        { name: "root", type: "uint256" },
        { name: "replacedAtTimestamp", type: "uint256" },
      ],
    };

    signatureISM = await signer.signTypedData(domain, ismTypes, identityStateMessage);
    signatureGSM = await signer.signTypedData(domain, gsmTypes, globalStateMessage);

    console.log("signatureISM: ", signatureISM);
    console.log("signatureGSM: ", signatureGSM);

    opv = await deployHelper.deployOracleProofValidator(domainName, signatureVersion);
    await opv.waitForDeployment();

    const { state } = await deployHelper.deployState();

    stateCrossChain = await deployHelper.deployStateCrossChain(
      await opv.getAddress(),
      await state.getAddress(),
    );
    await stateCrossChain.waitForDeployment();
  });

  it("Should verify the message", async function () {
    // Assume _validate function and any other dependencies are properly implemented in the contract
    let result = await opv.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.true;
    result = await opv.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.true;
  });

  it("Should fail to verify an invalid message", async function () {
    globalStateMessage.root++; // modify to make the message invalid
    let result = await opv.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.false;

    identityStateMessage.state++; // modify to make the message invalid
    result = await opv.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.false;
  });

  it("Should process the message", async function () {
    const su: StateUpdate = {
      idStateMsg: identityStateMessage,
      signature: signatureISM,
    };

    const gsu: GlobalStateUpdate = {
      globalStateMsg: globalStateMessage,
      signature: signatureGSM,
    };

    const crossChainProof = packCrossChainProofs([
      {
        proofType: "globalStateProof",
        proof: packGlobalStateUpdate(gsu),
      },
      {
        proofType: "stateProof",
        proof: packIdentityStateUpdate(su),
      },
      {
        proofType: "stateProof",
        proof: packIdentityStateUpdate(su),
      },
    ]);

    await expect(stateCrossChain.processProof(crossChainProof)).to.not.be.rejected;
  });
});
