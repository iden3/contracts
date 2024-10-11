import { ethers } from "hardhat";
import {
  CHAIN_IDS,
  CONTRACT_NAMES,
  ORACLE_SIGNING_ADDRESS_PRODUCTION,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../helpers/constants";
import hre from "hardhat";

async function main() {
  const oracleSigningAddress = ORACLE_SIGNING_ADDRESS_PRODUCTION; // production signing address

  const chainId = hre.network.config.chainId;

  let stateContractAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
  if (chainId === CHAIN_IDS.POLYGON_AMOY) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === CHAIN_IDS.POLYGON_MAINNET) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }
  const state = await ethers.getContractAt(CONTRACT_NAMES.STATE, stateContractAddress);
  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log(`CrossChainProofValidator address: ${crossChainProofValidatorAddress}`);

  const crossChainProofValidator = await ethers.getContractAt(
    CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR,
    crossChainProofValidatorAddress,
  );
  const tx = await crossChainProofValidator.setOracleSigningAddress(oracleSigningAddress);

  console.log(
    `Tx ${tx.hash} set oracle signing address to ${oracleSigningAddress} in CrossChainProofValidator contract ${await crossChainProofValidator.getAddress()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
