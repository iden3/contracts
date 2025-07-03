import { getStateContractAddress, Logger } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../upgrade/verifiers/helpers/testVerifier";
import { Contract } from "ethers";

// Replace these addresses with the ones you want to test
const universalVerifierAddress = "0x239197def007214b900cd6FE0D07171D55D6ECc8";
const validatorSigV2Address = "0x8A41ECC616b39026eF8FDF76b31858C4E0002C45";
const validatorMTPV2Address = "0x797a6E24282e3d91Dd548cDD2dDE578Aad73c0b0";
const validatorV3Address = "0x972b54C608a6Fcb21c03Dc0a900d599037943906";

async function testVerification(verifier: Contract) {
  const requestId_V3 = await setZKPRequest_KYCAgeCredential(verifier, validatorV3Address, "v3");
  // const requestId_V3 = 1766847064778389154530786576979235973837093675271674408424581047337212641n;
  await submitZKPResponses_KYCAgeCredential(requestId_V3, verifier, "v3", {
    stateContractAddress: "0x35844E0c28545D1AB8654aF3B14C58aEEaE0eD26",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_SigV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorSigV2Address,
    "sigV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_SigV2, verifier, "sigV2", {
    stateContractAddress: "0x35844E0c28545D1AB8654aF3B14C58aEEaE0eD26",
    verifierContractAddress: await verifier.getAddress(),
    checkSubmitZKResponseV2: false,
  });

  const requestId_MTPV2 = await setZKPRequest_KYCAgeCredential(
    verifier,
    validatorMTPV2Address,
    "mtpV2",
  );
  await submitZKPResponses_KYCAgeCredential(requestId_MTPV2, verifier, "mtpV2", {
    stateContractAddress: "0x35844E0c28545D1AB8654aF3B14C58aEEaE0eD26",
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
