import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import {
  setZKPRequest_KYCAgeCredential,
  submitZKPResponses_KYCAgeCredential,
} from "./helpers/testVerifier";
import { getChainId, getStateContractAddress } from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import fs from "fs";
import path from "path";

const forceImport = false;

async function main() {
  const chainId = await getChainId();
  const network = hre.network.name;

  // EmbeddedZKPVerifer is abstract contract
  // In real upgrade, you should use THE NAME as THE ADDRESS
  // of your custom contract, which inherits EmbeddedZKPVerifer
  let verifierContract = await ethers.getContractAt(
    "<verifier contract name>", // EmbeddedZKPVerifierWrapper
    "<verifier contract address>",
  );

  console.log("Starting Embedded Verifier Contract Upgrade");

  const stateContractAddress = await getStateContractAddress();

  const [signer] = await ethers.getSigners();
  const proxyAdminOwnerSigner = signer;
  const verifierOwnerSigner = signer;

  const deployerHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, verifierOwnerSigner],
    true,
  );

  const verifierOwnerAddressBeforeUpgrade = await verifierContract.owner();
  const verifierRequestsCountBeforeUpgrade = await verifierContract.getZKPRequestsCount();
  console.log("Owner Address Before Upgrade: ", verifierOwnerAddressBeforeUpgrade);

  const verifierLib = await deployerHelper.deployVerifierLib();

  // **** Upgrade Embedded Verifier ****
  const verifierFactory = await ethers.getContractFactory("EmbeddedZKPVerifierWrapper", {
    libraries: {
      VerifierLib: await verifierLib.getAddress(),
    },
  });

  try {
    verifierContract = await upgrades.upgradeProxy(
      await verifierContract.getAddress(),
      verifierFactory,
      {
        unsafeAllow: ["external-library-linking"],
      },
    );
  } catch (e) {
    if (forceImport) {
      console.log("Error upgrading proxy. Forcing import...");
      await upgrades.forceImport(await verifierContract.getAddress(), verifierFactory);
      verifierContract = await upgrades.upgradeProxy(
        await verifierContract.getAddress(),
        verifierFactory,
        {
          unsafeAllow: ["external-library-linking"],
        },
      );
    } else {
      throw e;
    }
  }

  await verifierContract.waitForDeployment();

  const tx = await verifierContract.connect(verifierOwnerSigner).setState(stateContractAddress);
  await tx.wait();
  // ************************

  console.log("Checking data after upgrade");

  const universalVerifierOwnerAddressAfter = await verifierContract.owner();
  const verifierRequestsCountAfterUpgrade = await verifierContract.getZKPRequestsCount();

  expect(verifierOwnerAddressBeforeUpgrade).to.equal(universalVerifierOwnerAddressAfter);
  expect(verifierRequestsCountBeforeUpgrade).to.equal(verifierRequestsCountAfterUpgrade);

  console.log("Verifier Contract Upgrade Finished");

  const pathOutputJson = path.join(
    __dirname,
    `../../deployments_output/deploy_embedded_verifier_output_${chainId}_${network}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    verifierContract: await verifierContract.getAddress(),
    verifierLib: await verifierLib.getAddress(),
    state: stateContractAddress,
    network: network,
    chainId,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));

  // console.log("Testing verifiation with submitZKPResponseV2 after migration...");
  // await testVerification(
  //   verifierContract,
  //   contractsInfo.VALIDATOR_V3.unifiedAddress,
  //   stateContractAddress,
  // );
}

async function testVerification(
  verifier: Contract,
  validatorV3Address: string,
  stateContractAddress: string,
) {
  const requestId = 112233;
  await setZKPRequest_KYCAgeCredential(requestId, verifier, validatorV3Address, "v3");
  await submitZKPResponses_KYCAgeCredential(requestId, verifier, "v3", {
    stateContractAddress: stateContractAddress,
    verifierContractAddress: contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
    checkSubmitZKResponseV2: true,
  });
}

// onlyTestVerification() // Use this to only test verification after upgrade
main() // Use this to upgrade and test verification
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
