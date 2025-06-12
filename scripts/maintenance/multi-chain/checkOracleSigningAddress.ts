import {
  getProviders,
  getStateContractAddress,
  isContract,
  Logger,
} from "../../../helpers/helperUtils";
import {
  contractsInfo,
  DEFAULT_MNEMONIC,
  LEGACY_ORACLE_SIGNING_ADDRESS_PRODUCTION,
  ORACLE_SIGNING_ADDRESS_PRODUCTION,
} from "../../../helpers/constants";
import { ethers } from "hardhat";

const mnemonicWallet = ethers.Wallet.fromPhrase(DEFAULT_MNEMONIC);

async function cycleOverProviders(expectedSigningAddress: string, addressType: "main" | "legacy") {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    const stateContractAddress = await getStateContractAddress(
      Number((await jsonRpcProvider.getNetwork()).chainId),
    );

    let oracleSigningAddressIsValid = true;

    if (!(await isContract(stateContractAddress, jsonRpcProvider))) {
      oracleSigningAddressIsValid = false;
      Logger.error(`${provider.network}: ${stateContractAddress} is not a contract`);
    } else {
      const wallet = new ethers.Wallet(mnemonicWallet.privateKey, jsonRpcProvider);
      const state = await ethers.getContractAt(
        contractsInfo.STATE.name,
        stateContractAddress,
        wallet,
      );
      let oracleSigningAddress;
      try {
        const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();

        const crossChainProofValidator = await ethers.getContractAt(
          contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
          crossChainProofValidatorAddress,
          wallet,
        );
        oracleSigningAddress =
          addressType === "main"
            ? await crossChainProofValidator.getOracleSigningAddress()
            : await crossChainProofValidator.getLegacyOracleSigningAddress();
      } catch (error) {}
      if (oracleSigningAddress !== expectedSigningAddress) {
        oracleSigningAddressIsValid = false;
        Logger.error(
          `${provider.network}: Oracle ${addressType} signing address is not valid. Expected: ${expectedSigningAddress}. Actual: ${oracleSigningAddress}`,
        );
      }
    }

    if (oracleSigningAddressIsValid) {
      Logger.success(
        `${provider.network}: Oracle ${addressType} signing address is valid: ${expectedSigningAddress}`,
      );
    }
  }
}

async function main() {
  const addr = ORACLE_SIGNING_ADDRESS_PRODUCTION;
  const addr2 = LEGACY_ORACLE_SIGNING_ADDRESS_PRODUCTION;
  console.log(`Checking Oracle signing address: ${addr}`);
  await cycleOverProviders(addr, "main");
  console.log(`Checking Legacy Oracle signing address: ${addr2}`);
  await cycleOverProviders(addr2, "legacy");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
