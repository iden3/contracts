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
const universalVerifierAddress = "0x3331e3C1e7aA5d69A8e3573e78141f49d10EDD96";
const validatorSigV2Address = "0x1376f6C2B9dBD7D7FDc11B0C3b0fc1f4BB373350";
const validatorMTPV2Address = "0x15F14751a6235CD364e58d4a2B44F518F214ad5B";
const validatorV3Address = "0x3A68D9c9755F011Fd8a963D7c79A5Fc5E59318c6";
// Replace with your actual state contract address
const stateContractAddress = "0xc3bcD8c32C571FF158D3F9ef191eDD76596A52f9";
// Replace with your actual custom network details
const method = core.DidMethod.Iden3;
const blockchain = "aurora";
const network = core.NetworkId.Test;
const chainId = 1313161555;
const networkFlag = 0b0101_0010;
// Replace with your actual auth method
const authMethodEmbeddedAuth = "embeddedAuth";

async function testVerification(verifier: Contract) {
  // Register the DID method for your custom network
  core.registerDidMethodNetwork({
    method: method,
    blockchain: blockchain,
    chainId: chainId,
    network: network,
    networkFlag: networkFlag,
  });

  const requestId_V3 = await setZKPRequest_KYCAgeCredential(verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
    authMethod: authMethodEmbeddedAuth,
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
    authMethod: authMethodEmbeddedAuth,
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
    authMethod: authMethodEmbeddedAuth,
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
