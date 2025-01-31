import { ethers } from "hardhat";
import { contractsInfo, ORACLE_SIGNING_ADDRESS_PRODUCTION } from "../../helpers/constants";
import { getStateContractAddress } from "../../helpers/helperUtils";

async function main() {
  const oracleSigningAddress = ORACLE_SIGNING_ADDRESS_PRODUCTION; // production signing address

  const stateContractAddress = await getStateContractAddress();
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
