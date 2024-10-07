import { ethers } from "hardhat";
import { getConfig } from "../helpers/helperUtils";
import { CONTRACT_NAMES } from "../helpers/constants";

async function main() {
  const oracleSigningAddress = "0xf0Ae6D287aF14f180E1FAfe3D2CB62537D7b1A82"; // production signing address

  const config = getConfig();
  if (!ethers.isAddress(config.stateContractAddress)) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set");
  }

  const state = await ethers.getContractAt(CONTRACT_NAMES.STATE, config.stateContractAddress);
  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log(`CrossChainProofValidator address: ${crossChainProofValidatorAddress}`);

  const crossChainProofValidator = await ethers.getContractAt(
    CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR,
    crossChainProofValidatorAddress,
  );
  const tx = await crossChainProofValidator.setOracleSigningAddress(oracleSigningAddress);

  console.log(`Oracle signing address set to ${oracleSigningAddress} in tx ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
