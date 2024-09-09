import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { UniversalVerifierContractMigrationHelper } from "../../../helpers/UniversalVerifierContractMigrationHelper";
import * as universalVerifierArtifact from "../../../artifacts/contracts/verifiers/UniversalVerifier.sol/UniversalVerifier.json";
import * as stateArtifact from "../../../artifacts/contracts/state/State.sol/State.json";
import { expect } from "chai";
import { Contract } from "ethers";
import { StateContractMigrationHelper } from "../../../helpers/StateContractMigrationHelper";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "./helpers/testVerifier";

// Amoy
const proxyAdminOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
const universalVerifierContractAddress = "0x1B20320042b29AE5c1a3ADc1674cb6bF8760530f";
const universalVerifierOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
const stateContractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
const impersonate = true;

// Hardhat localhost
// const proxyAdminOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// const universalVerifierContractAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
// const universalVerifierOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// const impersonate = false;

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(proxyAdminOwnerAddress);
    const universalVerifierOwnerSigner = await ethers.getImpersonatedSigner(
      universalVerifierOwnerAddress,
    );
    return { proxyAdminOwnerSigner, universalVerifierOwnerSigner };
  } else {
    // const privateKey = process.env.PRIVATE_KEY as string;
    // const proxyAdminOwnerSigner = new ethers.Wallet(privateKey, ethers.provider);
    // const universalVerifierOwnerSigner = new ethers.Wallet(privateKey, ethers.provider);

    const [signer] = await ethers.getSigners();
    const proxyAdminOwnerSigner = signer;
    const universalVerifierOwnerSigner = signer;

    return { proxyAdminOwnerSigner, universalVerifierOwnerSigner };
  }
}

async function main() {
  console.log("Starting Universal Verifier Contract Upgrade");
  await TestStateUpgrade();
  const { proxyAdminOwnerSigner, universalVerifierOwnerSigner } = await getSigners(impersonate);

  const universalVerifierDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, universalVerifierOwnerSigner],
    true,
  );

  const universalVerifierMigrationHelper = new UniversalVerifierContractMigrationHelper(
    universalVerifierDeployHelper,
    proxyAdminOwnerSigner,
  );

  const universalVerifierContract = await universalVerifierMigrationHelper.getInitContract({
    contractNameOrAbi: universalVerifierArtifact.abi,
    address: universalVerifierContractAddress,
  });

  const universalVerifierOwnerAddressBefore = await universalVerifierContract.owner();
  console.log("Owner Address Before Upgrade: ", universalVerifierOwnerAddressBefore);
  const dataBeforeUpgrade =
    await universalVerifierMigrationHelper.getDataFromContract(universalVerifierContract);

  const whitelistedValidators = dataBeforeUpgrade.validators;

  for (const validator of whitelistedValidators) {
    expect(await universalVerifierContract.isWhitelistedValidator(validator)).to.equal(true);
  }
  // **** Upgrade Universal Verifier ****
  await universalVerifierMigrationHelper.upgradeContract(universalVerifierContract);
  // ************************
  console.log("Checking data after upgrade");

  const dataAfterUpgrade =
    await universalVerifierMigrationHelper.getDataFromContract(universalVerifierContract);
  universalVerifierMigrationHelper.checkData(dataBeforeUpgrade, dataAfterUpgrade);
  const universalVerifierOwnerAddressAfter = await universalVerifierContract.owner();

  for (const validator of whitelistedValidators) {
    expect(await universalVerifierContract.isWhitelistedValidator(validator)).to.equal(true);
  }

  expect(universalVerifierOwnerAddressBefore).to.equal(universalVerifierOwnerAddressAfter);
  console.log("Verifier Contract Upgrade Finished");

  const state = await ethers.getContractAt(
    stateArtifact.abi,
    stateContractAddress,
    universalVerifierOwnerSigner,
  );

  const oracleProofValidatorAddress = await state.getOracleProofValidator();
  console.log("oracleProofValidatorAddress: ", oracleProofValidatorAddress);

  const tx = await universalVerifierContract.setState(state);
  await tx.wait();

  console.log("Adding new validators");
  // Add new validators
  const { validator: validatorMTP } = await universalVerifierDeployHelper.deployValidatorContracts(
    "VerifierMTPWrapper",
    "CredentialAtomicQueryMTPV2Validator",
    stateContractAddress,
  );
  const { validator: validatorSig } = await universalVerifierDeployHelper.deployValidatorContracts(
    "VerifierSigWrapper",
    "CredentialAtomicQuerySigV2Validator",
    stateContractAddress,
  );
  const { validator: validatorV3 } = await universalVerifierDeployHelper.deployValidatorContracts(
    "VerifierV3Wrapper",
    "CredentialAtomicQueryV3Validator",
    stateContractAddress,
  );

  const addToWhiteList1 = await universalVerifierContract.addValidatorToWhitelist(
    await validatorSig.getAddress(),
  );
  await addToWhiteList1.wait();
  const addToWhiteList2 = await universalVerifierContract.addValidatorToWhitelist(
    await validatorMTP.getAddress(),
  );
  await addToWhiteList2.wait();
  const addToWhiteList3 = await universalVerifierContract.addValidatorToWhitelist(
    await validatorV3.getAddress(),
  );
  await addToWhiteList3.wait();

  console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  await TestVerification(universalVerifierContract, await validatorV3.getAddress());
}

async function TestStateUpgrade() {
  const { proxyAdminOwnerSigner, universalVerifierOwnerSigner } = await getSigners(impersonate);

  const stateDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, universalVerifierOwnerSigner],
    true,
  );

  const stateMigrationHelper = new StateContractMigrationHelper(
    stateDeployHelper,
    proxyAdminOwnerSigner,
  );

  const stateContract = await stateMigrationHelper.getInitContract({
    contractNameOrAbi: stateArtifact.abi,
    address: stateContractAddress,
  });

  // **** Upgrade State ****
  await stateMigrationHelper.upgradeContract(stateContract, false, true); // first upgrade we need deploy oracle proof validator
  // ************************

  console.log("State Contract Upgrade Finished");
}

async function TestVerification(verifier: Contract, validatorV3Address: string) {
  const requestId = 112233;
  await setZKPRequest_KYCAgeCredential(requestId, verifier, validatorV3Address);
  await submitZKPResponses_KYCAgeCredential(requestId, verifier, {
    stateContractAddress,
    verifierContractAddress: universalVerifierContractAddress,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
