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
  await setZKPRequest_KYCAgeCredential(requestId, verifier, validatorV3Address, "v3", provider);
  await submitZKPResponses_KYCAgeCredential(requestId, verifier, "v3", {
    stateContractAddress: await getStateContractAddress(
      Number((await provider.getNetwork()).chainId),
    ),
    provider,
    signer: wallet,
    checkSubmitZKResponseV2: true,
  });
}

async function main() {
  if (!ethers.isAddress(process.env.PRIVATE_KEY)) {
    throw new Error(
      "PRIVATE_KEY is not set. You need to config it in .env file to be able to check the verification in all the networks automatically.\nIf you need only to check it in one network then use 'npx hardhat run scripts/maintenance/checkUniversalVerifierSingleNetwork.ts --network <network>'.",
    );
  }
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
