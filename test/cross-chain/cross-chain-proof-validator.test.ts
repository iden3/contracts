import { Logger } from "../../helpers/helperUtils";
import {
  GlobalStateMessage,
  IdentityStateMessage,
  packGlobalStateUpdateWithSignature,
  packIdentityStateUpdateWithSignature,
} from "../utils/packData";
import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { Contract, ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("State Cross Chain", function () {
  let crossChainProofValidator: Contract;
  let signer;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    const deployHelper = await DeployHelper.initialize(null, true);
    crossChainProofValidator = await deployHelper.deployCrossChainProofValidator();
  }

  beforeEach(async function () {
    await loadFixture(deployContractsFixture);
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

    const gspResult = await crossChainProofValidator.processGlobalStateProof(gsu);
    const ispResult = await crossChainProofValidator.processIdentityStateProof(isu);

    // result should be equal to timestamp from oracle as far as replacedAtTimestamp is zero in the messages
    expect(gspResult.replacedAtTimestamp).to.equal(gsm.timestamp);
    expect(ispResult.replacedAtTimestamp).to.equal(ism.timestamp);
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

    const gspResult = await crossChainProofValidator.processGlobalStateProof(gsu);
    const ispResult = await crossChainProofValidator.processIdentityStateProof(isu);

    // result should be equal replacedAtTimestamp in the messages
    expect(gspResult.replacedAtTimestamp).to.equal(gsm.replacedAtTimestamp);
    expect(ispResult.replacedAtTimestamp).to.equal(ism.replacedAtTimestamp);
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
    await expect(crossChainProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Oracle timestamp cannot be in the past",
    );
  });

  it("Oracle replacedAtTimestamp or oracle timestamp cannot be in the future", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: currentTimestamp + 10n ** 6n,
    };

    let proof = await packGlobalStateUpdateWithSignature(gsm, signer);
    await expect(crossChainProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Oracle replacedAtTimestamp or oracle timestamp cannot be in the future",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp + 10n ** 6n,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packIdentityStateUpdateWithSignature(ism, signer);
    await expect(crossChainProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Oracle replacedAtTimestamp or oracle timestamp cannot be in the future",
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
    await expect(crossChainProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Global state proof signing address is not valid",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packIdentityStateUpdateWithSignature(ism, signer, true);
    await expect(crossChainProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Identity state proof signing address is not valid",
    );
  });

  it("Should fail to verify a message which signature is invalid", async function () {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const gsm: GlobalStateMessage = {
      timestamp: currentTimestamp,
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: currentTimestamp + 10n ** 6n,
    };

    let proof = await packGlobalStateUpdateWithSignature(gsm, signer, false, true);
    await expect(crossChainProofValidator.processGlobalStateProof(proof)).to.be.rejectedWith(
      "Global state proof is not valid",
    );

    const ism: IdentityStateMessage = {
      timestamp: currentTimestamp,
      id: 25061242388220042378440625585145526395156084635704446088069097186261377537n,
      state: 289901420135126415231045754640573166676181332861318949204015443942679340619n,
      replacedAtTimestamp: 0n,
    };

    proof = await packIdentityStateUpdateWithSignature(ism, signer, false, true);
    await expect(crossChainProofValidator.processIdentityStateProof(proof)).to.be.rejectedWith(
      "Identity state proof is not valid",
    );
  });
});

describe("Oracle Signing Address Validation", function () {
  let CrossChainProofValidatorFactory;
  let crossChainProofValidator;
  let otherAccount;
  const oracleSigningAddress = "0x1234567890123456789012345678901234567890";
  const contractName = "CrossChainProofValidator";

  before(async function () {
    [otherAccount] = await ethers.getSigners();
    CrossChainProofValidatorFactory = await ethers.getContractFactory(contractName);
  });

  it("should revert when deploying with zero oracle signing address", async function () {
    await expect(
      CrossChainProofValidatorFactory.deploy("StateInfo", "1", ZeroAddress),
    ).to.be.revertedWithCustomError(
      CrossChainProofValidatorFactory,
      "OracleSigningAddressShouldNotBeZero",
    );
  });

  it("should deploy with correct parameters", async function () {
    crossChainProofValidator = await CrossChainProofValidatorFactory.deploy(
      "StateInfo",
      "1",
      oracleSigningAddress,
    );
    await crossChainProofValidator.waitForDeployment();
    Logger.success(`${contractName} deployed to: ${await crossChainProofValidator.getAddress()}`);
    expect(await crossChainProofValidator.getOracleSigningAddress()).to.equal(oracleSigningAddress);
  });

  it("should set a new oracle signing address", async function () {
    await crossChainProofValidator.setOracleSigningAddress(otherAccount.address);
    expect(await crossChainProofValidator.getOracleSigningAddress()).to.equal(otherAccount.address);
  });

  it("should revert when setting oracle signing address to zero", async function () {
    await expect(
      crossChainProofValidator.setOracleSigningAddress(ZeroAddress),
    ).to.be.revertedWithCustomError(
      crossChainProofValidator,
      "OracleSigningAddressShouldNotBeZero",
    );
  });
});
