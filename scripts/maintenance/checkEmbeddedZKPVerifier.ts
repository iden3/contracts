import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";

// Replace these addresses with the ones you want to test
const embeddedZKPVerifierAddress = "<put the embedded ZKP verifier address here>";
const validatorSigV2Address = "<put the validator sig v2 address here>";
const validatorMTPV2Address = "<put the validator mtp v2 address here>";
const validatorV3Address = "<put the validator v3 address here>";

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
    `\nChecking EmbeddedZKPVerifier verification on ${hre.network.name} with address ${embeddedZKPVerifierAddress}...`,
  );

  const embeddedZKPVerifier = await ethers.getContractAt(
    contractsInfo.EMBEDDED_ZKP_VERIFIER_WRAPPER.name,
    embeddedZKPVerifierAddress,
  );

  try {
    await testVerification(embeddedZKPVerifier);
    Logger.success(
      `${hre.network.name} embedded ZKP Verifier onchain ${embeddedZKPVerifierAddress} verified`,
    );
  } catch (error) {
    console.error(error);
    Logger.error(
      `${hre.network.name} embedded ZKP Verifier onchain ${embeddedZKPVerifierAddress} not verified`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
