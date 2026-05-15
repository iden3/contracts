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
const universalVerifierAddress = "0xe382E63eA276c34639D87AdF58Ed18cA1313c4De";
const validatorSigV2Address = "0x093c21547bE54445fCf71B1bD54641fbc4cEDC3d";
const validatorMTPV2Address = "0xfa1d72bbEBdEBc16d00e6e51B164746B297de688";
const validatorV3Address = "0x22ca8323E3E3D3B65732fDE7cb72f90FAED0Eaaf";
const validatorV3StableAddress = "0x78F3a59B41461aBFB90D020AC4D247f512ae2672";
// Replace with your actual state contract address
const stateContractAddress = "0xEF75Eb00E6Ac36b5C215aEBe6CD7Bca9b2Eb33be";
// Replace with your actual custom network details for method, blockchain and network
const method = core.DidMethod.Iden3;
const blockchain = "opn";
const didNetwork = "test";
// Replace with your custom network chainId and networkFlag
const chainId = 984;
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

  const requestId_V3Stable = await setZKPRequest_KYCAgeCredential(verifier, validatorV3StableAddress, "v3stable");
  await submitZKPResponses_KYCAgeCredential(requestId_V3Stable, verifier, "v3stable", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
    authMethod: authMethodEmbeddedAuth,
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
