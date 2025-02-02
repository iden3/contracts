import {
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
    const chainId = await getChainId();

    const stateContractAddress = await getStateContractAddress(chainId);

    let defaultIdTypeIsValid = false;
    let supportedIdTypesAreValid = false;
    let defaultIdType;
    let supportedIdTypeToCheck;
    let isIdTypeToCheckSupported = false;
    let isDefaultIdTypeSupported = false;
    if (!(await isContract(stateContractAddress, jsonRpcProvider))) {
      defaultIdTypeIsValid = false;
    } else {
      const wallet = new ethers.Wallet(mnemonicWallet.privateKey, jsonRpcProvider);
      const state = await ethers.getContractAt(
        contractsInfo.STATE.name,
        stateContractAddress,
        wallet,
      );
      defaultIdType = await state.getDefaultIdType();

      if (defaultIdType.startsWith("0x01")) {
        // 0x01 is the prefix for the default id type iden3
        defaultIdTypeIsValid = true;
      }

      supportedIdTypeToCheck = defaultIdType.replace("0x01", "0x02");
      isDefaultIdTypeSupported = await state.isIdTypeSupported(defaultIdType);

      isIdTypeToCheckSupported = await state.isIdTypeSupported(supportedIdTypeToCheck);
      if (
        !isIdTypeToCheckSupported ||
        [networks.POLYGON_AMOY.chainId, networks.POLYGON_MAINNET.chainId].includes(chainId)
      ) {
        supportedIdTypesAreValid = true;
      }
    }

    if (!defaultIdTypeIsValid) {
      Logger.error(`${provider.network}: Default Id Type ${defaultIdType} is not valid`);
    } else {
      Logger.success(`${provider.network}: Default Id Type ${defaultIdType} is valid`);
    }

    if (!supportedIdTypesAreValid) {
      Logger.error(
        `${provider.network}: Invalid supported Id Types: ${
          isDefaultIdTypeSupported
            ? `${defaultIdType} is supported`
            : `${defaultIdType} is not supported`
        }${
          defaultIdType !== supportedIdTypeToCheck
            ? isIdTypeToCheckSupported
              ? `, ${supportedIdTypeToCheck} is supported`
              : `, ${supportedIdTypeToCheck} is not supported`
            : ""
        }\n`,
      );
    } else {
      Logger.success(
        `${provider.network}: Supported Id Types are valid: ${
          isDefaultIdTypeSupported
            ? `${defaultIdType} is supported`
            : `${defaultIdType} is not supported`
        }, ${
          isIdTypeToCheckSupported
            ? `${supportedIdTypeToCheck} is supported`
            : `${supportedIdTypeToCheck} is not supported`
        }\n`,
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
