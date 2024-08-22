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

describe("Oracle Proof Validator", function () {
  let contract: Contract;
  let signer: Signer;
  let identityStateMessage: IdentityStateMessage;
  let globalStateMessage: GlobalStateMessage;
  let signatureISM, signatureGSM: string;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

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
      userID: 19829108207309885047084260525570486092116576508054294263928858481001996801n,
      state: 19584423714379092908357767184459178747839560563821033685241877638802820366565n,
      replacedAtTimestamp: 1723492214n,
    };

    globalStateMessage = {
      timestamp: 1724229626n,
      userID: 19829108207309885047084260525570486092116576508054294263928858481001996801n,
      root: 0n,
      replacedAtTimestamp: 1722211019n,
    };

    const ismTypes = {
      IdentityState: [
        { name: "timestamp", type: "uint256" },
        { name: "userID", type: "uint256" },
        { name: "state", type: "uint256" },
        { name: "replacedAtTimestamp", type: "uint256" },
      ],
    };

    const gsmTypes = {
      GlobalState: [
        { name: "timestamp", type: "uint256" },
        { name: "userID", type: "uint256" },
        { name: "root", type: "uint256" },
        { name: "replacedAtTimestamp", type: "uint256" },
      ],
    };

    signatureISM = await signer.signTypedData(domain, ismTypes, identityStateMessage);
    signatureGSM = await signer.signTypedData(domain, gsmTypes, globalStateMessage);

    console.log("signatureISM: ", signatureISM);
    console.log("signatureGSM: ", signatureGSM);

    contract = await ethers.deployContract("OracleProofValidator", [domainName, signatureVersion]);
    await contract.waitForDeployment();
  });

  it("Should verify the message", async function () {
    // Assume _validate function and any other dependencies are properly implemented in the contract
    let result = await contract.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.true;
    result = await contract.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.true;
  });

  it("Should fail to verify an invalid message", async function () {
    globalStateMessage.root++; // modify to make the message invalid
    let result = await contract.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.false;

    identityStateMessage.state++; // modify to make the message invalid
    result = await contract.verifyIdentityState(identityStateMessage, signatureISM);
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

    const res = await contract.processProof(crossChainProof);
    expect(res[0].length).to.be.equal(1);
    expect(res[1].length).to.be.equal(2);

    expect(res[0][0].timestamp).to.be.equal(globalStateMessage.timestamp);
    expect(res[0][0].userID).to.be.equal(globalStateMessage.userID);
    expect(res[0][0].root).to.be.equal(globalStateMessage.root);
    expect(res[0][0].replacedAtTimestamp).to.be.equal(globalStateMessage.replacedAtTimestamp);

    expect(res[1][0].timestamp).to.be.equal(identityStateMessage.timestamp);
    expect(res[1][0].userID).to.be.equal(identityStateMessage.userID);
    expect(res[1][0].state).to.be.equal(identityStateMessage.state);
    expect(res[1][0].replacedAtTimestamp).to.be.equal(identityStateMessage.replacedAtTimestamp);
  });
});
