import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import {
  GlobalStateUpdate,
  StateUpdate,
  IdentityStateMessage,
  GlobalStateMessage,
} from "../utils/packData";
import {
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

    //          "message": {
    //             "replacedAtTimestamp": "1723492214",
    //             "state": "19584423714379092908357767184459178747839560563821033685241877638802820366565",
    //             "timestamp": "1724170397",
    //             "userID": "19829108207309885047084260525570486092116576508054294263928858481001996801"
    //           }

    identityStateMessage = {
      timestamp: 1721407330n,
      userID: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
      state: 0n,
      replacedAtTimestamp: 0n,
    };

    //           "message": {
    //             "replacedAtTimestamp": "1722211019",
    //             "root": "0",
    //             "timestamp": "1724170431",
    //             "userID": "19829108207309885047084260525570486092116576508054294263928858481001996801"
    //           }

    globalStateMessage = {
      timestamp: 1721407330n,
      userID: 19829108207309885047084260525570486092116576508054294263928858481001996801n,
      root: 6376828012722752730323542484049180893581903547300301354812470207953471379731n,
      replacedAtTimestamp: 0n,
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

    expect(res[0][0].root).to.be.equal(globalStateMessage.root);
    expect(res[0][0].replacedByRoot).to.be.equal(0);
    expect(res[0][0].createdAtTimestamp).to.be.equal(0);
    expect(res[0][0].replacedAtTimestamp).to.be.equal(globalStateMessage.replacedAtTimestamp);
    expect(res[0][0].createdAtBlock).to.be.equal(0);
    expect(res[0][0].replacedAtBlock).to.be.equal(0);

    expect(res[1][0].id).to.be.equal(identityStateMessage.userID);
    expect(res[1][0].state).to.be.equal(identityStateMessage.state);
    expect(res[1][0].replacedByState).to.be.equal(0);
    expect(res[1][0].createdAtTimestamp).to.be.equal(0);
    expect(res[1][0].replacedAtTimestamp).to.be.equal(identityStateMessage.replacedAtTimestamp);
    expect(res[1][0].createdAtBlock).to.be.equal(0);
    expect(res[1][0].replacedAtBlock).to.be.equal(0);
  });
});
