import {
  getBlockTimestamp,
  getChainId,
  getProviders,
  getStateContractAddress,
  isContract,
  Logger,
} from "../../../helpers/helperUtils";
import { contractsInfo, DEFAULT_MNEMONIC, networks } from "../../../helpers/constants";
import { ethers } from "hardhat";

const mnemonicWallet = ethers.Wallet.fromPhrase(DEFAULT_MNEMONIC);

async function main() {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    try {
      const blockTimestamp = await getBlockTimestamp(jsonRpcProvider);
      Logger.success(`${provider.network}: blockTimeStamp ${blockTimestamp.toISOString()}`);
    } catch (error) {
      Logger.error(`${provider.network}: Failed to get block timestamp - ${error.message}`);
      continue;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
