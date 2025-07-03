import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";

// Replace these addresses with the ones you want to test
const universalVerifierAddress = "0x635255f446b91B12dEe885752Cd99638431B9aaE";
const validatorSigV2Address = "0x192443864a83C7645657Bfe9D08b12D7A13e37f4";
const validatorMTPV2Address = "0xDf67A2D54571abA0a5402924D6cF83Df93BA7b69";
const validatorV3Address = "0xB5314083f618cbACFB82A4bC444bC26A995605ca";

async function testVerification(verifier: Contract) {
  const requestId_V3 = await setZKPRequest_KYCAgeCredential(verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: "0x37fCe36Ddb2Ab6eBB8ba101e4dD46f94443385e0",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_SigV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorSigV2Address,
    "sigV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "sigV2", {
    stateContractAddress: "0x37fCe36Ddb2Ab6eBB8ba101e4dD46f94443385e0",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_MTPV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorMTPV2Address,
    "mtpV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_MTPV2, verifier, "mtpV2", {
    stateContractAddress: "0x37fCe36Ddb2Ab6eBB8ba101e4dD46f94443385e0",
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
