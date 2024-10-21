import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";

const universalVerifierAddress = "<put-your-universal-verifier-address>";
const validatorSigV2Address = "<put-your-validator-sigv2-address>";
const validatorMTPV2Address = "<put-your-validator-mtpv2-address>";
const validatorV3Address = "<put-your-validator-v3-address>";

async function testVerification(verifier: Contract) {
  const requestId_V3 = 7254189;
  await setZKPRequest_KYCAgeCredential(requestId_V3, verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: getStateContractAddress(),
    verifierContractAddress: await verifier.getAddress(),
  });

  const requestId_SigV2 = 7254190;
  await setZKPRequest_KYCAgeCredential(requestId_SigV2, verifier, validatorSigV2Address, "sigV2");
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "sigV2", {
    stateContractAddress: getStateContractAddress(),
    verifierContractAddress: await verifier.getAddress(),
  });

  const requestId_MTPV2 = 7254191;
  await setZKPRequest_KYCAgeCredential(requestId_MTPV2, verifier, validatorMTPV2Address, "mtpV2");
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "mtpV2", {
    stateContractAddress: getStateContractAddress(),
    verifierContractAddress: await verifier.getAddress(),
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
    Logger.success(`${hre.network.name} old Universal Verifier onchain verified`);
  } catch (error) {
    console.error(error);
    Logger.error(`${hre.network.name} old Universal Verifier onchain not verified`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
