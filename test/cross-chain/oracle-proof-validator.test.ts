import { GlobalStateMessage, IdentityStateMessage, packGlobalStateUpdateWithSignature, packIdentityStateUpdateWithSignature, } from "../utils/packData";
import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { Contract } from "ethers";
import { ethers } from "hardhat";

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

    const gsu = await packGlobalStateUpdateWithSignature(gsm, signer);
    const isu = await packIdentityStateUpdateWithSignature(ism, signer);

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

    const gsu = await packGlobalStateUpdateWithSignature(gsm, signer);
    const isu = await packIdentityStateUpdateWithSignature(ism, signer);

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

    const proof = await packIdentityStateUpdateWithSignature(ism, signer);
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

    let proof = await packGlobalStateUpdateWithSignature(gsm, signer);
    await expect(oracleProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Oracle replacedAt or oracle timestamp cannot be in the future",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp + 10n ** 6n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packIdentityStateUpdateWithSignature(ism, signer);
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

    let proof = await packGlobalStateUpdateWithSignature(gsm, signer, true);
    await expect(oracleProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Global state proof is not valid",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packIdentityStateUpdateWithSignature(ism, signer, true);
    await expect(oracleProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Identity state proof is not valid",
    );
  });
});
