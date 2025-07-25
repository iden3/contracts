import { Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";
import { core } from "@0xpolygonid/js-sdk";

// Replace these addresses with the ones of your custom network
const universalVerifierAddress = "0x5BdB53B37eB4D42E50C01f224e8e7B9289FD2284";
const validatorSigV2Address = "0x852F49800CA16738d94419e96a6Cb960960336D5";
const validatorMTPV2Address = "0xa46E4bf26F5e16708E6730ca0Dc6a51bA289134B";
const validatorV3Address = "0x5700b4930084374F5E909e20320C648bA34355C5";

async function testVerification(verifier: Contract) {
  // Register the DID method for your custom network
  core.registerDidMethodNetwork({
    method: core.DidMethod.Iden3,
    blockchain: "aurora",
    chainId: 1313161555,
    network: core.NetworkId.Test,
    networkFlag: 0b0101_0010,
  });

  // Replace with your actual state contract address
  const stateContractAddress = "0xd50C1b4Cb6C30540B8d1349340d70ac15f7Ab3df";

  const requestId_V3 = await setZKPRequest_KYCAgeCredential(verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
    authMethod: "noAuth",
  });

  const requestId_SigV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorSigV2Address,
    "sigV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "sigV2", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
    authMethod: "noAuth",
  });

  const requestId_MTPV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorMTPV2Address,
    "mtpV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_MTPV2, verifier, "mtpV2", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
    authMethod: "noAuth",
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
