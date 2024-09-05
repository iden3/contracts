import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { UniversalVerifierContractMigrationHelper } from "../../../helpers/UniversalVerifierContractMigrationHelper";
import * as universalVerifierArtifact from "../../../artifacts/contracts/verifiers/UniversalVerifier.sol/UniversalVerifier.json";
import { expect } from "chai";

// Amoy
const proxyAdminOwnerAddress = "0xFc8F850286C06ac5823687B88a21Cc99ec0128cb"; // "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const universalVerifierContractAddress = "0x1B20320042b29AE5c1a3ADc1674cb6bF8760530f"; // Amoy UniversalVerifier
const universalVerifierOwnerAddress = "0xFc8F850286C06ac5823687B88a21Cc99ec0128cb"; // "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const impersonate = true;
const whitelistedValidators = [
  "0x1426F3f629179073De72f3FC3E22DFFBbB0D59D8",
  "0x089c21fFdFccD9111366368D73BBcf78c562c515",
  "0xE42c3FF854815605AaFf5c1A695Bdd990bB5324C",
];

// Hardhat localhost
/* const proxyAdminOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const universalVerifierContractAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
const universalVerifierOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const impersonate = false;
const whitelistedValidators = [
  "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
]; */

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

  const dataBeforeUpgrade =
    await universalVerifierMigrationHelper.getDataFromContract(universalVerifierContract);

  for (const validator of whitelistedValidators) {
    expect(await universalVerifierContract.isWhitelistedValidator(validator)).to.equal(true);
  }
  // **** Upgrade Universal Verifier ****
  await universalVerifierMigrationHelper.upgradeContract(universalVerifierContract);
  // ************************

  const dataAfterUpgrade =
    await universalVerifierMigrationHelper.getDataFromContract(universalVerifierContract);
  universalVerifierMigrationHelper.checkData(dataBeforeUpgrade, dataAfterUpgrade);
  const universalVerifierOwnerAddressAfter = await universalVerifierContract.owner();

  for (const validator of whitelistedValidators) {
    expect(await universalVerifierContract.isWhitelistedValidator(validator)).to.equal(true);
  }

  expect(universalVerifierOwnerAddressBefore).to.equal(universalVerifierOwnerAddressAfter);
  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
