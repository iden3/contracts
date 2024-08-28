import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { IdentityStateMessage, GlobalStateMessage } from "../utils/packData";
import { DeployHelper } from "../../helpers/DeployHelper";

describe("Oracle Proof Validator", function () {
  let oracleSigner, otherSigner: Signer;
  let identityStateMessage: IdentityStateMessage;
  let globalStateMessage: GlobalStateMessage;
  let signatureISM, signatureGSM, otherSignerSignatureGSM, otherSignerSignatureISM: string;
  let oracleProofValidator: Contract;

  before(async function () {
    [oracleSigner, otherSigner] = await ethers.getSigners();
    const oracleSigningAddress = await oracleSigner.getAddress();

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

    signatureGSM = await oracleSigner.signTypedData(domain, gsmTypes, globalStateMessage);
    signatureISM = await oracleSigner.signTypedData(domain, ismTypes, identityStateMessage);

    otherSignerSignatureGSM = await otherSigner.signTypedData(domain, gsmTypes, globalStateMessage);
    otherSignerSignatureISM = await otherSigner.signTypedData(
      domain,
      ismTypes,
      identityStateMessage,
    );

    oracleProofValidator = await deployHelper.deployOracleProofValidator(
      domainName,
      signatureVersion,
      oracleSigningAddress,
    );
  });

  it("Should verify the message", async function () {
    // Assume _validate function and any other dependencies are properly implemented in the contract
    let result = await oracleProofValidator.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.true;
    result = await oracleProofValidator.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.true;
  });

  it("Should fail to verify an invalid message", async function () {
    globalStateMessage.root++; // modify to make the message invalid
    let result = await oracleProofValidator.verifyGlobalState(globalStateMessage, signatureGSM);
    expect(result).to.be.false;

    identityStateMessage.state++; // modify to make the message invalid
    result = await oracleProofValidator.verifyIdentityState(identityStateMessage, signatureISM);
    expect(result).to.be.false;
  });

  it("Should fail to verify a message signed by another signer", async function () {
    let result = await oracleProofValidator.verifyIdentityState(
      identityStateMessage,
      otherSignerSignatureISM,
    );
    expect(result).to.be.false;
    result = await oracleProofValidator.verifyGlobalState(
      globalStateMessage,
      otherSignerSignatureGSM,
    );
    expect(result).to.be.false;
  });
});
