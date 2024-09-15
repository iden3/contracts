import {
  GlobalStateMessage,
  GlobalStateUpdate,
  IdentityStateMessage,
  packGlobalStateUpdate,
  packIdentityStateUpdate,
  StateUpdate,
} from "../utils/packData";
import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";

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

async function packGSU(
  gsm: GlobalStateMessage,
  signer: Signer,
  tamperWithMessage: boolean = false,
): Promise<string> {
  const types = {
    GlobalState: [
      { name: "timestamp", type: "uint256" },
      { name: "idType", type: "bytes2" },
      { name: "root", type: "uint256" },
      { name: "replacedAtTimestamp", type: "uint256" },
    ],
  };

  const gsu: GlobalStateUpdate = {
    globalStateMsg: gsm,
    signature: await signer.signTypedData(domain, types, gsm),
  };

  if (tamperWithMessage) {
    gsu.globalStateMsg.timestamp++;
  }

  return packGlobalStateUpdate(gsu);
}

async function packISU(
  ism: IdentityStateMessage,
  signer: Signer,
  tamperWithMessage: boolean = false,
): Promise<string> {
  const types = {
    IdentityState: [
      { name: "timestamp", type: "uint256" },
      { name: "id", type: "uint256" },
      { name: "state", type: "uint256" },
      { name: "replacedAtTimestamp", type: "uint256" },
    ],
  };

  const isu: StateUpdate = {
    idStateMsg: ism,
    signature: await signer.signTypedData(domain, types, ism),
  };

  if (tamperWithMessage) {
    isu.idStateMsg.timestamp++;
  }

  return packIdentityStateUpdate(isu);
}

describe("State Cross Chain", function () {
  let oracleProofValidator: Contract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();
    const deployHelper = await DeployHelper.initialize(null, true);
    oracleProofValidator = await deployHelper.deployOracleProofValidator();
  });

  it("Should process the messages without replacedAtTimestamp", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 0n,
    };

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    const gsu = await packGSU(gsm, signer);
    const isu = await packISU(ism, signer);

    const gspResult = await oracleProofValidator.processGlobalStateProof(gsu);
    const ispResult = await oracleProofValidator.processIdentityStateProof(isu);

    // result should be equal to timestamp from oracle as far as replacedAtTimestamp is zero in the messages
    expect(gspResult.replacedAt).to.equal(gsm.timestamp);
    expect(ispResult.replacedAt).to.equal(ism.timestamp);
  });

  it("Should process the messages with replacedAtTimestamp", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 100n,
    };

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 100n,
    };

    const gsu = await packGSU(gsm, signer);
    const isu = await packISU(ism, signer);

    const gspResult = await oracleProofValidator.processGlobalStateProof(gsu);
    const ispResult = await oracleProofValidator.processIdentityStateProof(isu);

    // result should be equal replacedAtTimestamp in the messages
    expect(gspResult.replacedAt).to.equal(gsm.replacedAtTimestamp);
    expect(ispResult.replacedAt).to.equal(ism.replacedAtTimestamp);
  });

  it("Oracle timestamp should not be in the past", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp - 10n ** 6n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    const proof = await packISU(ism, signer);
    await expect(oracleProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Oracle timestamp cannot be in the past",
    );
  });

  it("Oracle replacedAt or oracle timestamp cannot be in the future", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: currentTimestamp + 10n ** 6n,
    };

    let proof = await packGSU(gsm, signer);
    await expect(oracleProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Oracle replacedAt or oracle timestamp cannot be in the future",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp + 10n ** 6n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packISU(ism, signer);
    await expect(oracleProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Oracle replacedAt or oracle timestamp cannot be in the future",
    );
  });

  it("Should fail to verify a message which was tampered with", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: currentTimestamp + 10n ** 6n,
    };

    let proof = await packGSU(gsm, signer, true);
    await expect(oracleProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Global state proof is not valid",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packISU(ism, signer, true);
    await expect(oracleProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Identity state proof is not valid",
    );
  });
});
