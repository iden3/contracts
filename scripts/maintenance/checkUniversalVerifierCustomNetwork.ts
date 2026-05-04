import { Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";
import { core } from "@0xpolygonid/js-sdk";
import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

// Replace these addresses with the ones deployed in your custom network
const universalVerifierAddress = "<UNIVERSAL_VERIFIER_ADDRESS>";
const validatorSigV2Address = "<VALIDATOR_SIGV2_ADDRESS>";
const validatorMTPV2Address = "<VALIDATOR_MTPV2_ADDRESS>";
const validatorV3Address = "<VALIDATOR_V3_ADDRESS>";
// Replace with your actual state contract address
const stateContractAddress = "<STATE_CONTRACT_ADDRESS>";
// Replace with your actual custom network details for method, blockchain and network
const method = core.DidMethod.Iden3;
const blockchain = "<blockchain>";
const didNetwork = "<network>";
// Replace with your custom network chainId and networkFlag
const chainId = 0;
const networkFlag = 0b1111_1111;
// Replace with your actual auth method
const authMethodEmbeddedAuth = "embeddedAuth";

async function testVerification(verifier: Contract) {
  // Register the DID method for your custom network
  core.registerDidMethodNetwork({
    method: method,
    blockchain: blockchain,
    chainId: chainId,
    network: didNetwork,
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
    `\nChecking UniversalVerifier verification on ${networkName} with address ${universalVerifierAddress}...`,
  );

  const universalVerifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    universalVerifierAddress,
  );

  try {
    await testVerification(universalVerifier);
    Logger.success(
      `${networkName} Universal Verifier onchain ${universalVerifierAddress} verified`,
    );
  } catch (error) {
    console.error(error);
    Logger.error(
      `${networkName} Universal Verifier onchain ${universalVerifierAddress} not verified`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
