import { ethers } from "hardhat";
import {
  networks,
  contractsInfo,
  ORACLE_SIGNING_ADDRESS_PRODUCTION,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
} from "../../helpers/constants";
import hre from "hardhat";

async function main() {
  const oracleSigningAddress = ORACLE_SIGNING_ADDRESS_PRODUCTION; // production signing address

  const chainId = hre.network.config.chainId;

  let stateContractAddress = contractsInfo.STATE.unifiedAddress as string;
  if (chainId === networks.POLYGON_AMOY.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === networks.POLYGON_MAINNET.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }
  const state = await ethers.getContractAt(contractsInfo.STATE.name, stateContractAddress);
  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log(`CrossChainProofValidator address: ${crossChainProofValidatorAddress}`);

  const crossChainProofValidator = await ethers.getContractAt(
    contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
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
