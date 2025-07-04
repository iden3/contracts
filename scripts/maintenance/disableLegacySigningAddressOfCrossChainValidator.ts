import { ethers } from "hardhat";
import { contractsInfo } from "../../helpers/constants";
import { getStateContractAddress } from "../../helpers/helperUtils";

async function main() {
  const stateContractAddress = await getStateContractAddress();
  const state = await ethers.getContractAt(contractsInfo.STATE.name, stateContractAddress);
  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log(`CrossChainProofValidator address: ${crossChainProofValidatorAddress}`);

  const crossChainProofValidator = await ethers.getContractAt(
    contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
    crossChainProofValidatorAddress,
  );
  const tx = await crossChainProofValidator.disableLegacyOracleSigningAddress(
      // {
      //   nonce: 59,
      //   gasPrice:             5000000000,
      //   initialBaseFeePerGas: 2500000000,
      //   gasLimit: 30000
      // }
  );

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
