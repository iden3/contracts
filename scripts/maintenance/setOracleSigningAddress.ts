import { ethers } from "hardhat";
import { getConfig, isContract } from "../../helpers/helperUtils";
import { CONTRACT_NAMES, ORACLE_SIGNING_ADDRESS_PRODUCTION } from "../../helpers/constants";

async function main() {
  const oracleSigningAddress = ORACLE_SIGNING_ADDRESS_PRODUCTION; // production signing address

  const config = getConfig();
  if (!(await isContract(config.stateContractAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
  }

  const state = await ethers.getContractAt(CONTRACT_NAMES.STATE, config.stateContractAddress);
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
