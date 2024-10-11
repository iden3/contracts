import { getProviders, isContract, Logger } from "../../../helpers/helperUtils";
import {
  contractsInfo,
  networks,
  ORACLE_SIGNING_ADDRESS_PRODUCTION,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
} from "../../../helpers/constants";
import hre, { ethers } from "hardhat";

async function main() {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    const chainId = hre.network.config.chainId;

    let stateContractAddress = contractsInfo.STATE.unifiedAddress;
    if (chainId === networks.POLYGON_AMOY.chainId) {
      stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
    }
    if (chainId === networks.POLYGON_MAINNET.chainId) {
      stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
    }

    let oracleSigningAddressIsValid = true;
    const defaultOracleSigningAddress = ORACLE_SIGNING_ADDRESS_PRODUCTION; // production signing address

    if (!(await isContract(stateContractAddress, jsonRpcProvider))) {
      oracleSigningAddressIsValid = false;
    } else {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, jsonRpcProvider);
      const state = await ethers.getContractAt(
        contractsInfo.STATE.name,
        stateContractAddress,
        wallet,
      );
      const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();

      const crossChainProofValidator = await ethers.getContractAt(
        contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
        crossChainProofValidatorAddress,
        wallet,
      );
      const oracleSigningAddress = await crossChainProofValidator.getOracleSigningAddress();
      if (oracleSigningAddress !== defaultOracleSigningAddress) {
        oracleSigningAddressIsValid = false;
      }
    }

    if (!oracleSigningAddressIsValid) {
      Logger.error(`${provider.network}: Oracle signing address is not valid`);
    } else {
      Logger.success(`${provider.network}: Oracle signing address is valid`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
