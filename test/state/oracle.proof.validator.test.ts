import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

interface IdentityStateMessage {
  from: string;
  timestamp: bigint;
  state: bigint;
  stateCreatedAtTimestamp: bigint;
  stateReplacedAtTimestamp: bigint;
  gistRoot: bigint;
  gistRootCreatedAtTimestamp: bigint;
  gistRootReplacedAtTimestamp: bigint;
  identity: bigint;
}

describe("Oracle Proof Validator", function () {
  let contract: Contract;
  let owner: Signer;
  let identityStateMessage: IdentityStateMessage;
  let signature: string;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    identityStateMessage = {
      from: await owner.getAddress(),
      timestamp: 1721407330n,
      state: 13704162472154210473949595093402377697496480870900777124562670166655890846618n,
      stateCreatedAtTimestamp: 1720111993n,
      stateReplacedAtTimestamp: 0n,
      gistRoot: 6376828012722752730323542484049180893581903547300301354812470207953471379731n,
      gistRootCreatedAtTimestamp: 1721404722n,
      gistRootReplacedAtTimestamp: 0n,
      identity: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
    };

    const domainName = "StateInfo";
    const signatureVersion = "1";
    const chainId = 0;
    const verifyingContract = ethers.ZeroAddress;
    const typeHash =
      "StateInfo(address from,uint256 timestamp,uint256 state,uint256 stateCreatedAtTimestamp,uint256 stateReplacedAtTimestamp,uint256 gistRoot,uint256 gistRootCreatedAtTimestamp,uint256 gistRootReplacedAtTimestamp,uint256 identity)";
    const argumentTypeHash = ethers.keccak256(ethers.toUtf8Bytes(typeHash));

    const domain = {
      name: domainName,
      version: signatureVersion,
      chainId,
      verifyingContract,
    };

    const types = {
      StateInfo: [
        { name: "from", type: "address" },
        { name: "timestamp", type: "uint256" },
        { name: "state", type: "uint256" },
        { name: "stateCreatedAtTimestamp", type: "uint256" },
        { name: "stateReplacedAtTimestamp", type: "uint256" },
        { name: "gistRoot", type: "uint256" },
        { name: "gistRootCreatedAtTimestamp", type: "uint256" },
        { name: "gistRootReplacedAtTimestamp", type: "uint256" },
        { name: "identity", type: "uint256" },
      ],
    };

    signature = await owner.signTypedData(domain, types, identityStateMessage);

    console.log("signature JS: ", signature);

    contract = await ethers.deployContract("OracleProofValidator", [
      domainName,
      signatureVersion,
      argumentTypeHash,
    ]);
    await contract.waitForDeployment();
  });

  it("should verify the message", async function () {
    // Assume _validate function and any other dependencies are properly implemented in the contract
    const result = await contract.verify(identityStateMessage, signature);
    expect(result).to.be.true;
  });

  it("should fail to verify an invalid message", async function () {
    // Modify the message to make it invalid
    identityStateMessage.state = 2n;

    const result = await contract.verify(identityStateMessage, signature);
    expect(result).to.be.false;
  });
});
