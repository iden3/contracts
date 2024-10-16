import { getProviders, getStateContractAddress, Logger } from "../../../helpers/helperUtils";
import { contractsInfo, networks } from "../../../helpers/constants";
import { ethers } from "hardhat";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "../../upgrade/verifiers/helpers/testVerifier";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

async function testVerification(
  verifier: Contract,
  validatorV3Address: string,
  provider: JsonRpcProvider,
  wallet: Wallet,
) {
  const requestId = 7254189;
  await setZKPRequest_KYCAgeCredential(requestId, verifier, validatorV3Address, provider);
  await submitZKPResponses_KYCAgeCredential(requestId, verifier, {
    stateContractAddress: getStateContractAddress(Number((await provider.getNetwork()).chainId)),
    verifierContractAddress: contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
    provider,
    signer: wallet,
  });
}

async function main() {
  const providers = getProviders();

  const networksVerificationOK: string[] = [];
  const networksVerificationKO: string[] = [];
  for (const provider of providers) {
    if ([networks.LINEA_SEPOLIA.name].includes(provider.network)) {
      continue;
    }
    console.log(`\nChecking UniversalVerifier verification on ${provider.network}...`);
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, jsonRpcProvider);

    const universalVerifier = await ethers.getContractAt(
      contractsInfo.UNIVERSAL_VERIFIER.name,
      contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      wallet,
    );

    try {
      await testVerification(
        universalVerifier,
        contractsInfo.VALIDATOR_V3.unifiedAddress,
        jsonRpcProvider,
        wallet,
      );
      networksVerificationOK.push(provider.network);
    } catch (error) {
      console.error(error);
      networksVerificationKO.push(provider.network);
    }
  }

  if (networksVerificationOK.length > 0) {
    Logger.success(
      `${networksVerificationOK.length} networks verification onchain OK: ${networksVerificationOK.join(", ")}`,
    );
  }
  if (networksVerificationKO.length > 0) {
    Logger.error(
      `${networksVerificationKO.length} networks verification onchain KO: ${networksVerificationKO.join(", ")}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
