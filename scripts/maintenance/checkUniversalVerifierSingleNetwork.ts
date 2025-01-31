import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";

// Replace these addresses with the ones you want to test
const universalVerifierAddress = contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress;
const validatorSigV2Address = contractsInfo.VALIDATOR_SIG.unifiedAddress;
const validatorMTPV2Address = contractsInfo.VALIDATOR_MTP.unifiedAddress;
const validatorV3Address = contractsInfo.VALIDATOR_V3.unifiedAddress;

async function testVerification(verifier: Contract) {
  const requestId_V3 = 7254189;
  await setZKPRequest_KYCAgeCredential(requestId_V3, verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: await getStateContractAddress(),
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_SigV2 = 7254190;
  await setZKPRequest_KYCAgeCredential(requestId_SigV2, verifier, validatorSigV2Address, "sigV2");
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "sigV2", {
    stateContractAddress: await getStateContractAddress(),
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_MTPV2 = 7254191;
  await setZKPRequest_KYCAgeCredential(requestId_MTPV2, verifier, validatorMTPV2Address, "mtpV2");
  await submitZKPResponses_KYCAgeCredential(requestId_MTPV2, verifier, "mtpV2", {
    stateContractAddress: await getStateContractAddress(),
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
