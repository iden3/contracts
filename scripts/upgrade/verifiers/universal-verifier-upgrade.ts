import { ethers, ignition } from "hardhat";
import * as stateArtifact from "../../../artifacts/contracts/state/State.sol/State.json";
import { expect } from "chai";
import { Contract } from "ethers";
import {
  checkContractVersion,
  getConfig,
  getDeploymentParameters,
  getStateContractAddress,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { UniversalVerifierAtModule } from "../../../ignition/modules/contractsAt";
import UpgradeUniversalVerifierModule from "../../../ignition/modules/upgrades/upgradeUniversalVerifier";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// If you want to use impersonation, set the impersonate variable to true
// With ignition we can't use impersonation, so we need to transfer ownership to the signer
// before the upgrade to test in a fork. This is done in the transferOwnership function below.
const impersonate = false;

const config = getConfig();

let stateContractAddress = contractsInfo.STATE.unifiedAddress;
const universalVerifierAddress = contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress; // replace with your address if needed

async function getDataFromContract(universalVerifier: Contract) {
  const countRequests = await universalVerifier.getRequestsCount();
  const stateAddress = await universalVerifier.getStateAddress();
  return { countRequests, stateAddress };
}

function checkData(...args: any[]): any {
  const result1 = args[0];
  const result2 = args[1];

  const { countRequests: countRequestsV1, stateAddress: stateAddress1 } = result1;
  const { countRequests: countRequestsV2, stateAddress: stateAddress2 } = result2;
  console.assert(countRequestsV1 === countRequestsV2, "lenght of requests not equal");
  console.assert(stateAddress1 === stateAddress2, "state address not equal");
}

async function transferOwnership(signer: HardhatEthersSigner, contractAt: any) {
  const proxyAdmin = await ethers.getContractAt("ProxyAdmin", contractAt.proxyAdmin.target);
  const universalVerifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    contractAt.proxy.target,
  );

  console.log("Proxy Admin owner: ", await proxyAdmin.owner());
  console.log("Proxy owner: ", await universalVerifier.owner());
  console.log("Transferring ownership of Proxy Admin and Proxy to: ", signer.address);

  const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(await proxyAdmin.owner());
  const universalVerifierOwnerSigner = await ethers.getImpersonatedSigner(
    await universalVerifier.owner(),
  );

  const tx1 = await proxyAdmin.connect(proxyAdminOwnerSigner).transferOwnership(signer.address);
  await tx1.wait();

  const tx2 = await universalVerifier
    .connect(universalVerifierOwnerSigner)
    .transferOwnership(signer.address);
  await tx2.wait();

  const tx3 = await universalVerifier.connect(signer).acceptOwnership();
  await tx3.wait();
}

async function main() {
  console.log(`Starting Universal Verifier Contract Upgrade for ${universalVerifierAddress}`);
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  const { upgraded, currentVersion } = await checkContractVersion(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    parameters.UniversalVerifierAtModule.proxyAddress,
    contractsInfo.UNIVERSAL_VERIFIER.version,
  );

  if (upgraded) {
    console.log(
      `Contract is already upgraded to version ${contractsInfo.UNIVERSAL_VERIFIER.version}`,
    );
    return;
  } else {
    console.log(
      `Contract is not upgraded and will upgrade version ${currentVersion} to ${contractsInfo.UNIVERSAL_VERIFIER.version}`,
    );
  }

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }
  stateContractAddress = parameters.StateAtModule.proxyAddress || getStateContractAddress();

  const [signer] = await ethers.getSigners();

  console.log("Proxy Admin Owner Address for the upgrade: ", signer.address);
  console.log("Universal Verifier Owner Address for the upgrade: ", signer.address);

  const UniversalVerifierContractAt = await ignition.deploy(UniversalVerifierAtModule, {
    defaultSender: await signer.getAddress(),
    parameters: parameters,
    deploymentId: deploymentId,
  });
  if (impersonate) {
    console.log("Impersonating Ledger Account by ownership transfer");
    await transferOwnership(signer, UniversalVerifierContractAt);
  }
  const universalVerifierContract = UniversalVerifierContractAt.proxy;
  const universalVerifierOwnerAddressBefore = await universalVerifierContract.owner();
  console.log("Owner Address Before Upgrade: ", universalVerifierOwnerAddressBefore);
  const dataBeforeUpgrade = await getDataFromContract(universalVerifierContract);

  const whitelistedValidators = [
    parameters.CredentialAtomicQueryMTPV2ValidatorAtModule.proxyAddress,
    parameters.CredentialAtomicQuerySigV2ValidatorAtModule.proxyAddress,
    parameters.CredentialAtomicQueryV3ValidatorAtModule.proxyAddress,
  ];

  for (const validator of whitelistedValidators) {
    expect(await universalVerifierContract.isWhitelistedValidator(validator)).to.equal(true);
  }

  // **** Upgrade Universal Verifier ****
  const { newImplementation, universalVerifier, verifierLib, proxy, proxyAdmin } =
    await ignition.deploy(UpgradeUniversalVerifierModule, {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    });
  parameters.UniversalVerifierAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  parameters.VerifierLibAtModule = {
    contractAddress: verifierLib.target,
  };
  parameters.UniversalVerifierNewImplementationAtModule = {
    contractAddress: newImplementation.target,
  };
  // ************************
  console.log("Checking data after upgrade");

  await verifyContract(verifierLib.target, contractsInfo.VERIFIER_LIB.verificationOpts);
  await verifyContract(proxy.target, contractsInfo.UNIVERSAL_VERIFIER.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  const dataAfterUpgrade = await getDataFromContract(universalVerifier);

  checkData(dataBeforeUpgrade, dataAfterUpgrade);
  const universalVerifierOwnerAddressAfter = await universalVerifier.owner();

  for (const validator of whitelistedValidators) {
    expect(await universalVerifier.isWhitelistedValidator(validator)).to.equal(true);
  }

  expect(universalVerifierOwnerAddressBefore).to.equal(universalVerifierOwnerAddressAfter);
  console.log("Verifier Contract Upgrade Finished");

  const state = await ethers.getContractAt(stateArtifact.abi, stateContractAddress, signer);

  console.log("Id Type configured in state: ", await state.getDefaultIdType());

  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log("crossChainProofValidatorAddress: ", crossChainProofValidatorAddress);

  const tx = await universalVerifier.connect(signer).setState(state);
  await tx.wait();

  await writeDeploymentParameters(parameters);
}

main() // Use this to upgrade and test verification
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
