import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
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
const removePreviousIgnitionFiles = true;
const impersonate = false;

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
  fs.readFileSync(
    `./scripts/deploy_cross_chain_verification_with_requests_output_${chainId}_${network}.json`,
    "utf-8",
  ),
);

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(
      uvUpgrade.proxyAdminOwnerAddress,
    );
    const universalVerifierOwnerSigner = await ethers.getImpersonatedSigner(
      uvUpgrade.universalVerifierOwnerAddress,
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

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  console.log(
    "Universal Verifier Owner Address: ",
    await universalVerifierOwnerSigner.getAddress(),
  );
  const deployerHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, universalVerifierOwnerSigner],
    true,
  );

  if (removePreviousIgnitionFiles && (network === "localhost" || network === "hardhat")) {
    console.log("Removing previous ignition files for chain: ", chainId);
    fs.rmSync(`./ignition/deployments/chain-${chainId}`, { recursive: true, force: true });
  }

  await upgradeState(deployerHelper, proxyAdminOwnerSigner);

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

  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log("crossChainProofValidatorAddress: ", crossChainProofValidatorAddress);

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

    const isWhitelisted = await universalVerifierContract.isWhitelistedValidator(
      v.validatorContractAddress,
    );
    if (!isWhitelisted) {
      console.log(`Adding validator ${v.validatorContractName} to whitelist...`);
      const addToWhiteListTx = await universalVerifierContract.addValidatorToWhitelist(
        v.validatorContractAddress,
      );
      await addToWhiteListTx.wait();
    }
  }

  console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  await testVerification(universalVerifierContract, uvUpgrade.validatorV3);
}

async function onlyTestVerification() {
  const { universalVerifierOwnerSigner } = await getSigners(impersonate);
  const universalVerifierContract = await ethers.getContractAt(
    universalVerifierArtifact.abi,
    uvUpgrade.universalVerifier,
    universalVerifierOwnerSigner,
  );
  console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  await testVerification(universalVerifierContract, uvUpgrade.validatorV3);
}

async function upgradeState(deployHelper: DeployHelper, signer: any) {
  const stateMigrationHelper = new StateContractMigrationHelper(deployHelper, signer);

  const stateContract = await stateMigrationHelper.getInitContract({
    contractNameOrAbi: stateArtifact.abi,
    address: uvUpgrade.state,
  });

  // **** Upgrade State ****
  await stateMigrationHelper.upgradeContract(stateContract, false, true); // first upgrade we need deploy oracle proof validator
  // ************************
  // If testing with forked zkevm network wait for 1 confirmation, otherwise is waiting forever
  const waitConfirmations = network === "localhost" || network === "hardhat" ? 1 : 5;
  switch (chainId) {
    case 1101: // polygon zkevm
      console.log("Setting default id type to 0x0214");
      const tx1 = await stateContract.setDefaultIdType("0x0214");
      // ignition needs 5 confirmations for deployment/upgrade transactions to work
      await tx1.wait(waitConfirmations);
      break;
    case 2442: // polygon cardona
      console.log("Setting default id type to 0x0215");
      const tx2 = await stateContract.setDefaultIdType("0x0215");
      // ignition needs 5 confirmations for deployment/upgrade transactions to work
      await tx2.wait(waitConfirmations);
      break;
    default:
      break;
  }

  console.log("State Contract Upgrade Finished");
}

async function testVerification(verifier: Contract, validatorV3Address: string) {
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
