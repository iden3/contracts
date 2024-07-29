import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { IdentityStateMessage, GlobalStateMessage } from "./messages";

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
      from: await signer.getAddress(),
      timestamp: 1721407330n,
      identity: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
      state: 0n,
      replacedByState: 0n,
      createdAtTimestamp: 1720111993n,
      replacedAtTimestamp: 0n,
    };

    globalStateMessage = {
      from: await signer.getAddress(),
      timestamp: 1721407330n,
      root: 6376828012722752730323542484049180893581903547300301354812470207953471379731n,
      replacedByRoot: 0n,
      createdAtTimestamp: 1721404722n,
      replacedAtTimestamp: 0n,
    };

    const ismTypes = {
      IdentityState: [
        { name: "from", type: "address" },
        { name: "timestamp", type: "uint256" },
        { name: "identity", type: "uint256" },
        { name: "state", type: "uint256" },
        { name: "replacedByState", type: "uint256" },
        { name: "createdAtTimestamp", type: "uint256" },
        { name: "replacedAtTimestamp", type: "uint256" },
      ],
    };

    const gsmTypes = {
      GlobalState: [
        { name: "from", type: "address" },
        { name: "timestamp", type: "uint256" },
        { name: "root", type: "uint256" },
        { name: "replacedByRoot", type: "uint256" },
        { name: "createdAtTimestamp", type: "uint256" },
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

  it("should verify the message", async function () {
    // Assume _validate function and any other dependencies are properly implemented in the contract
    let result = await contract.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.true;
    result = await contract.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.true;
  });

  it("should fail to verify an invalid message", async function () {
    globalStateMessage.root++; // modify to make the message invalid
    let result = await contract.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.false;

    identityStateMessage.state++; // modify to make the message invalid
    result = await contract.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.false;
  });
});
