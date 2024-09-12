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

// Amoy deployed contracts (oracle Slack Chat)
const proxyAdminOwnerAddress = "0xFc8F850286C06ac5823687B88a21Cc99ec0128cb";
const universalVerifierContractAddress = "0xB7487dDa8f0c465730fC715785743C459747bcbC";
const universalVerifierOwnerAddress = "0xFc8F850286C06ac5823687B88a21Cc99ec0128cb";
const stateContractAddress = "0xDFF190bC887B5Bbae80BCa8999E54ea7d084026f";
const validatorSigContractAddress = "0x04dcEd2b96C72eD92f1F066592DBa2b7942d0f3B";
const validatorMTPContractAddress = "0x435A97C4653b768Eb7F01F780E2Da72213fB78d6";
const validatorV3ContractAddress = "0xb53e2487ff38b59E183125E3cE79679005AbC7b2";
const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
const validatorV3ContractName = "CredentialAtomicQueryV3Validator";
const impersonate = false;


// AMOY documented contracts
// const proxyAdminOwnerAddress = "0xE9D7fCDf32dF4772A7EF7C24c76aB40E4A42274a";
// const universalVerifierContractAddress = "0xB752Eec418f178ac8B48f15962B55c37F8D4748d";
// const universalVerifierOwnerAddress = "0x80203136fAe3111B810106bAa500231D4FD08FC6";
// const stateContractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
// const validatorSigContractAddress = "0x8c99F13dc5083b1E4c16f269735EaD4cFbc4970d";
// const validatorMTPContractAddress = "0xEEd5068AD8Fecf0b9a91aF730195Fef9faB00356";
// const validatorV3ContractAddress = "0xa5f08979370AF7095cDeDb2B83425367316FAD0B";
// const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
// const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
// const validatorV3ContractName = "CredentialAtomicQueryV3Validator";
// const impersonate = false;

// Hardhat localhost
// const proxyAdminOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// const universalVerifierContractAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
// const universalVerifierOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// const stateContractAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
// const validatorSigContractAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
// const validatorMTPContractAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
// const validatorV3ContractAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
// const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
// const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
// const validatorV3ContractName = "CredentialAtomicQueryV3Validator";
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
  const { proxyAdminOwnerSigner, universalVerifierOwnerSigner } = await getSigners(impersonate);

  const deployerHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, universalVerifierOwnerSigner],
    true,
  );

  await TestStateUpgrade(deployerHelper, proxyAdminOwnerSigner);

  const universalVerifierMigrationHelper = new UniversalVerifierContractMigrationHelper(
    deployerHelper,
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

  console.log("Id Type configured in state: ", await state.getDefaultIdType());

  const oracleProofValidatorAddress = await state.getOracleProofValidator();
  console.log("oracleProofValidatorAddress: ", oracleProofValidatorAddress);

  const tx = await universalVerifierContract.setState(state);
  await tx.wait();

  console.log("Upgrading validators and adding them to whitelist...");

  const validators = [
    {
      validatorContractAddress: validatorMTPContractAddress,
      validatorContractName: validatorMTPContractName,
    },
    {
      validatorContractAddress: validatorSigContractAddress,
      validatorContractName: validatorSigContractName,
    },
    {
      validatorContractAddress: validatorV3ContractAddress,
      validatorContractName: validatorV3ContractName,
    },
  ];

  for (const v of validators) {
    const { validator } = await deployerHelper.upgradeValidator(
      v.validatorContractAddress,
      v.validatorContractName,
    );
    await validator.waitForDeployment();
    console.log(`Validator ${v.validatorContractName} version:`, await validator.version());

    // This is not the scope of upgrading but we could add the validators
    // to the whitelist here so future requests can be verified by them
    // const addToWhiteListTx = await universalVerifierContract.addValidatorToWhitelist(
    //   v.validatorContractAddress,
    // );
    // await addToWhiteListTx.wait();
  }

  console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  await TestVerification(universalVerifierContract, validatorV3ContractAddress);
}

async function main2() {
  const { universalVerifierOwnerSigner } = await getSigners(impersonate);
  const universalVerifierContract = await ethers.getContractAt(
    universalVerifierArtifact.abi,
    universalVerifierContractAddress,
    universalVerifierOwnerSigner,
  );
  console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  await TestVerification(universalVerifierContract, validatorV3ContractAddress);
}

async function TestStateUpgrade(deployHelper: DeployHelper, signer: any) {
  const stateMigrationHelper = new StateContractMigrationHelper(deployHelper, signer);

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

main2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
