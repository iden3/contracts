import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";

// Replace these addresses with the ones you want to test
const universalVerifierAddress = "0x05e93510114bF1389cb7a3e2E86e0Bc28cbC4e78";
const validatorSigV2Address = "0x9a2d3e3a02779C134460037De5f75aC05F2EEceC";
const validatorMTPV2Address = "0x4374DD2E8135179D64Dc105B184864f3159bc4FE";
const validatorV3Address = "0x85aDF85d1ebC1C21B8449B2a5CDbd6105739338D";

async function testVerification(verifier: Contract) {
  const requestId_V3 = await setZKPRequest_KYCAgeCredential(verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: "0xdFfEdB89EBA5624C663d606deDaBecA6b5480568",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_SigV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorSigV2Address,
    "sigV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "sigV2", {
    stateContractAddress: "0xdFfEdB89EBA5624C663d606deDaBecA6b5480568",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_MTPV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorMTPV2Address,
    "mtpV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_MTPV2, verifier, "mtpV2", {
    stateContractAddress: "0xdFfEdB89EBA5624C663d606deDaBecA6b5480568",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });
}

async function main() {
  console.log(
    `\nChecking UniversalVerifier verification on ${hre.network.name} with address ${universalVerifierAddress}...`,
  );

  const universalVerifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    universalVerifierAddress,
  );

  try {
    await testVerification(universalVerifier);
    Logger.success(
      `${hre.network.name} Universal Verifier onchain ${universalVerifierAddress} verified`,
    );
  } catch (error) {
    console.error(error);
    Logger.error(
      `${hre.network.name} Universal Verifier onchain ${universalVerifierAddress} not verified`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
