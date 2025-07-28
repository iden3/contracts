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
const universalVerifierAddress = "0xe067cE4425Fc5D12705DeC51f84bF66683910Ceb";
const validatorSigV2Address = "0x759aB3E97cCf25c036d0ad264cbD687cB025E851";
const validatorMTPV2Address = "0x7FAE83C096a75150aF0eB918AbF7072335aF14bA";
const validatorV3Address = "0xD8Da54a4419E071A562fF7bF979888Ff2C0B847c";
// Replace with your actual state contract address
const stateContractAddress = "0xBc068db8dB60703904b293d355fE3B1349652ee0";
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
