import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers, upgrades } from "hardhat";
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
import fs from "fs";

const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
const validatorV3ContractName = "CredentialAtomicQueryV3Validator";
const impersonate = true;

// Amoy deployed contracts (oracle Slack Chat)
// const proxyAdminOwnerAddress = "0xFc8F850286C06ac5823687B88a21Cc99ec0128cb";
// const universalVerifierContractAddress = "0xB7487dDa8f0c465730fC715785743C459747bcbC";
// const universalVerifierOwnerAddress = "0xFc8F850286C06ac5823687B88a21Cc99ec0128cb";
// const stateContractAddress = "0xDFF190bC887B5Bbae80BCa8999E54ea7d084026f";
// const validatorSigContractAddress = "0x04dcEd2b96C72eD92f1F066592DBa2b7942d0f3B";
// const validatorMTPContractAddress = "0x435A97C4653b768Eb7F01F780E2Da72213fB78d6";
// const validatorV3ContractAddress = "0xb53e2487ff38b59E183125E3cE79679005AbC7b2";

// AMOY documented contracts
// const proxyAdminOwnerAddress = "0xE9D7fCDf32dF4772A7EF7C24c76aB40E4A42274a";
// const universalVerifierContractAddress = "0xB752Eec418f178ac8B48f15962B55c37F8D4748d";
// const universalVerifierOwnerAddress = "0x80203136fAe3111B810106bAa500231D4FD08FC6";
// const stateContractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
// const validatorSigContractAddress = "0x8c99F13dc5083b1E4c16f269735EaD4cFbc4970d";
// const validatorMTPContractAddress = "0xEEd5068AD8Fecf0b9a91aF730195Fef9faB00356";
// const validatorV3ContractAddress = "0xa5f08979370AF7095cDeDb2B83425367316FAD0B";

const chainId = hre.network.config.chainId;
const network = hre.network.name;

const uvUpgrade = JSON.parse(
  fs.readFileSync(`./scripts/deploy_universal_verifier_output_${chainId}_${network}.json`, "utf-8"),
);

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(
      uvUpgrade.proxyAdminOwnerAddress,
    );
    const universalVerifierOwnerSigner = await ethers.getImpersonatedSigner(
      uvUpgrade.universalVeriferOwnerAddress,
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
    address: uvUpgrade.universalVerifier,
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
    uvUpgrade.state,
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
      validatorContractAddress: uvUpgrade.validatorMTP,
      validatorContractName: validatorMTPContractName,
    },
    {
      validatorContractAddress: uvUpgrade.validatorSig,
      validatorContractName: validatorSigContractName,
    },
    {
      validatorContractAddress: uvUpgrade.validatorV3,
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
  await TestVerification(universalVerifierContract, uvUpgrade.validatorV3);
}

async function onlyTestVerification() {
  const { universalVerifierOwnerSigner } = await getSigners(impersonate);
  const universalVerifierContract = await ethers.getContractAt(
    universalVerifierArtifact.abi,
    uvUpgrade.universalVerifier,
    universalVerifierOwnerSigner,
  );
  console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  await TestVerification(universalVerifierContract, uvUpgrade.validatorV3);
}

async function TestStateUpgrade(deployHelper: DeployHelper, signer: any) {
  const stateMigrationHelper = new StateContractMigrationHelper(deployHelper, signer);

  const stateContract = await stateMigrationHelper.getInitContract({
    contractNameOrAbi: stateArtifact.abi,
    address: uvUpgrade.state,
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
    stateContractAddress: uvUpgrade.state,
    verifierContractAddress: uvUpgrade.universalVerifier,
  });
}

// onlyTestVerification() // Use this to only test verification after upgrade
main() // Use this to upgrade and test verification
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
