import { getProviders, isContract } from "../../../helpers/helperUtils";
import {
  CONTRACT_NAMES,
  NETWORK_NAMES,
  ORACLE_SIGNING_ADDRESS_PRODUCTION,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../../helpers/constants";
import { ethers } from "hardhat";

async function main() {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    let stateAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
    if (provider.network === NETWORK_NAMES.POLYGON_AMOY) {
      stateAddress = STATE_ADDRESS_POLYGON_AMOY;
    }
    if (provider.network === NETWORK_NAMES.POLYGON_MAINNET) {
      stateAddress = STATE_ADDRESS_POLYGON_MAINNET;
    }

    let oracleSigningAddressIsValid = true;
    const defaultOracleSigningAddress = ORACLE_SIGNING_ADDRESS_PRODUCTION; // production signing address

    if (!(await isContract(stateAddress, jsonRpcProvider))) {
      oracleSigningAddressIsValid = false;
    } else {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, jsonRpcProvider);
      const state = await ethers.getContractAt(CONTRACT_NAMES.STATE, stateAddress, wallet);
      const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();

      const crossChainProofValidator = await ethers.getContractAt(
        CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR,
        crossChainProofValidatorAddress,
        wallet,
      );
      const oracleSigningAddress = await crossChainProofValidator.getOracleSigningAddress();
      if (oracleSigningAddress !== defaultOracleSigningAddress) {
        oracleSigningAddressIsValid = false;
      }
    }

    if (!oracleSigningAddressIsValid) {
      console.log(`\x1b[31m  [𐄂] \x1b[0m${provider.network}: Oracle signing address is not valid`);
    } else {
      console.log(`\x1b[32m  [✓] \x1b[0m${provider.network}: Oracle signing address is valid`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
