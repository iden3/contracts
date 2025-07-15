import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";
import { core } from "@0xpolygonid/js-sdk";

// Replace these addresses with the ones you want to test
const universalVerifierAddress = "0xc89fA32a60aa91f0AbB2225c9e338bf8F634F20d"; //contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress;
const validatorSigV2Address = "0xcaA5f0A11BdCfC5b0dCfe73cda8D9eD17cd1D725"; // contractsInfo.VALIDATOR_SIG.unifiedAddress;
const validatorMTPV2Address = "0xb3F8F6DeF180EE9A6cF77f303625db3ba5AA82eb"; //contractsInfo.VALIDATOR_MTP.unifiedAddress;
const validatorV3Address = "0x638cfb7017e5cAe64a3e4BF61D753741c90EC14B"; //contractsInfo.VALIDATOR_V3.unifiedAddress;

async function testVerification(verifier: Contract) {
  core.registerDidMethodNetwork({
    method: core.DidMethod.Iden3,
    blockchain: "aurora",
    chainId: 1313161555,
    network: core.NetworkId.Test,
    networkFlag: 0b0101_0001,
  });

  const stateContractAddress = "0x34fAA91432eA45d243B7E321B38C927224d68d7F"; //await getStateContractAddress();
  const requestId_V3 = await setZKPRequest_KYCAgeCredential(verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
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
