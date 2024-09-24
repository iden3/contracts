import hre, { ethers } from "hardhat";

const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
const validatorV3ContractName = "CredentialAtomicQueryV3Validator";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log(signer.address);

  const universalVerifier = await ethers.getContractAt(
    "UniversalVerifier",
    process.env.UNIVERSAL_VERIFIER_CONTRACT_ADDRESS as string,
  );

  console.log("Adding validators to Universal Verifier...");

  const validators = [
    {
      validatorContractAddress: process.env.VALIDATOR_MTP_CONTRACT_ADDRESS,
      validatorContractName: validatorMTPContractName,
    },
    {
      validatorContractAddress: process.env.VALIDATOR_SIG_CONTRACT_ADDRESS,
      validatorContractName: validatorSigContractName,
    },
    {
      validatorContractAddress: process.env.VALIDATOR_V3_CONTRACT_ADDRESS,
      validatorContractName: validatorV3ContractName,
    },
  ];

  for (const v of validators) {
    const isWhitelisted = await universalVerifier.isWhitelistedValidator(
      v.validatorContractAddress,
    );
    if (!isWhitelisted) {
      console.log(
        `Adding validator ${v.validatorContractName} (${v.validatorContractAddress}) to whitelist...`,
      );
      const addToWhiteListTx = await universalVerifier
        .connect(signer)
        .addValidatorToWhitelist(v.validatorContractAddress);
      await addToWhiteListTx.wait();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
