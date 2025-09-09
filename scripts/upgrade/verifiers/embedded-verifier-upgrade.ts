import { ethers, ignition } from "hardhat";
import * as stateArtifact from "../../../artifacts/contracts/state/State.sol/State.json";
import { expect } from "chai";
import {
  checkContractVersion,
  getConfig,
  getDeploymentParameters,
  getStateContractAddress,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { buildModule } from "@nomicfoundation/ignition-core";
import { Contract } from "ethers";
import { StateAtModule } from "../../../ignition/modules/contractsAt";

const embeddedVerifierName = "<verifier contract name>";
const embeddedVerifierAddress = "<verifier contract address>";
const embeddedVerifierProxyAddress = "<verifier proxy address>";
const embeddedVerifierProxyAdminAddress = "<verifier proxy admin address>";
const version = "<verifier contract version>"; // Should be a valid ignition module name. Example: V_1_0_0

const UpgradeVerifierModule = buildModule("UpgradeVerifierModule".concat(version), (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(embeddedVerifierName, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);
  const state = m.useModule(StateAtModule).proxy;

  const newImplementation = m.contract(embeddedVerifierName, [], {
    libraries: {
      VerifierLib: verifierLib,
    },
  });

  // As we are working with same proxy the storage is already initialized
  const initializeData = "0x";

  m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
    from: proxyAdminOwner,
  });

  return {
    verifier: proxy,
    newImplementation,
    verifierLib,
    state,
    proxyAdmin,
    proxy,
  };
});

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

async function main() {
  const config = getConfig();

  console.log(`Starting Embedded Verifier Contract Upgrade for ${embeddedVerifierAddress}`);
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  const { upgraded, currentVersion } = await checkContractVersion(
    embeddedVerifierName,
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

  const stateContractAddress = parameters.StateAtModule.proxyAddress || getStateContractAddress();

  const [signer] = await ethers.getSigners();

  console.log("Proxy Admin Owner Address for the upgrade: ", signer.address);
  console.log("Universal Verifier Owner Address for the upgrade: ", signer.address);

  const proxyAt = await ethers.getContractAt(embeddedVerifierName, embeddedVerifierProxyAddress);

  const verifierContract = proxyAt;
  const verifierOwnerAddressBefore = await verifierContract.owner();
  console.log("Owner Address Before Upgrade: ", verifierOwnerAddressBefore);
  const dataBeforeUpgrade = await getDataFromContract(verifierContract);

  const whitelistedValidators = [
    parameters.CredentialAtomicQueryMTPV2ValidatorAtModule.proxyAddress,
    parameters.CredentialAtomicQuerySigV2ValidatorAtModule.proxyAddress,
    parameters.CredentialAtomicQueryV3ValidatorAtModule.proxyAddress,
  ];

  for (const validator of whitelistedValidators) {
    expect(await verifierContract.isWhitelistedValidator(validator)).to.equal(true);
  }

  parameters["UpgradeVerifierModule".concat(version)] = {
    proxyAddress: embeddedVerifierProxyAddress,
    proxyAdminAddress: embeddedVerifierProxyAdminAddress,
  };

  // **** Upgrade Embedded Verifier ****
  const { newImplementation, verifier, verifierLib, proxy, proxyAdmin } = await ignition.deploy(
    UpgradeVerifierModule,
    {
      defaultSender: signer.address,
      parameters: parameters,
      deploymentId: deploymentId,
    },
  );
  parameters[embeddedVerifierName.concat("AtModule")] = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  // ************************
  console.log("Checking data after upgrade");

  await verifyContract(verifierLib.target, contractsInfo.VERIFIER_LIB.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  const dataAfterUpgrade = await getDataFromContract(verifier);

  checkData(dataBeforeUpgrade, dataAfterUpgrade);
  const verifierOwnerAddressAfter = await verifier.owner();

  for (const validator of whitelistedValidators) {
    expect(await verifier.isWhitelistedValidator(validator)).to.equal(true);
  }

  expect(verifierOwnerAddressBefore).to.equal(verifierOwnerAddressAfter);
  console.log("Verifier Contract Upgrade Finished");

  const state = await ethers.getContractAt(stateArtifact.abi, stateContractAddress, signer);

  console.log("Id Type configured in state: ", await state.getDefaultIdType());

  const crossChainProofValidatorAddress = await state.getCrossChainProofValidator();
  console.log("crossChainProofValidatorAddress: ", crossChainProofValidatorAddress);

  const tx = await verifier.connect(signer).setState(state);
  await tx.wait();

  await writeDeploymentParameters(parameters);
}

main() // Use this to upgrade and test verification
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
