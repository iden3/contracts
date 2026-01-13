import { contractsInfo } from "../../helpers/constants";
import { getStateContractAddress } from "../../helpers/helperUtils";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const stateContractAddress = await getStateContractAddress();
  const state = await ethers.getContractAt(contractsInfo.STATE.name, stateContractAddress);
  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log(`CrossChainProofValidator address: ${crossChainProofValidatorAddress}`);

  const crossChainProofValidator = await ethers.getContractAt(
    contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
    crossChainProofValidatorAddress,
  );
  const tx = await crossChainProofValidator.disableLegacyOracleSigningAddress();

  console.log(
    `Tx ${tx.hash} disabled legacy Oracle Signing address in Cross-Chain Proof Validator ${await crossChainProofValidator.getAddress()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
