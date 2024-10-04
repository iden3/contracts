import { DeployHelper } from "../../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { StateContractMigrationHelper } from "../../../../helpers/StateContractMigrationHelper";
import { expect } from "chai"; // abi of contract that will be upgraded

import * as stateArtifact from "../../../../artifacts/contracts/state/State.sol/State.json";

// Polygon Mumbai

// const proxyAdminOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
// const stateContractAddress = "0x134B1BE34911E39A8397ec6289782989729807a4";
// const stateOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
// const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
// const stateValue = "0x2c68da47bf4c9acb3320076513905f7b63d8070ed8276ad16ca5402b267a7c26";
// const impersonate = false;

// Privado test

// const proxyAdminOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
// const stateContractAddress = "0x975556428F077dB5877Ea2474D783D6C69233742";
// const stateOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
// // const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
// // const stateValue = "0x2c68da47bf4c9acb3320076513905f7b63d8070ed8276ad16ca5402b267a7c26";
// const impersonate = false;

// Privado main

const proxyAdminOwnerAddress = "0x80203136fAe3111B810106bAa500231D4FD08FC6";
const stateContractAddress = "0x975556428F077dB5877Ea2474D783D6C69233742";
const stateOwnerAddress = "0x80203136fAe3111B810106bAa500231D4FD08FC6";
// const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
// const stateValue = "0x2c68da47bf4c9acb3320076513905f7b63d8070ed8276ad16ca5402b267a7c26";
const impersonate = false;

// Polygon PoS mainnet

// const proxyAdminOwnerAddress = "0x80203136fAe3111B810106bAa500231D4FD08FC6";
// const stateContractAddress = "0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D";
// const stateOwnerAddress = "0x80203136fAe3111B810106bAa500231D4FD08FC6";
// const id = "27400734408475525514287944072871082260891789330025154387098461662248702210";
// const stateValue = "1406871096418685973996308927175869145223551926097850896167027746851817634897";
// const impersonate = true;

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(proxyAdminOwnerAddress);
    const stateOwnerSigner = await ethers.getImpersonatedSigner(stateOwnerAddress);
    return { proxyAdminOwnerSigner, stateOwnerSigner };
  } else {
    // const privateKey = process.env.PRIVATE_KEY as string;
    // const proxyAdminOwnerSigner = new ethers.Wallet(privateKey, ethers.provider);
    // const stateOwnerSigner = new ethers.Wallet(privateKey, ethers.provider);

    const [signer] = await ethers.getSigners();
    const proxyAdminOwnerSigner = signer;
    const stateOwnerSigner = signer;

    return { proxyAdminOwnerSigner, stateOwnerSigner };
  }
}

async function main() {
  const { proxyAdminOwnerSigner, stateOwnerSigner } = await getSigners(impersonate);

  const stateDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, stateOwnerSigner],
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
  //
  // const dataBeforeUpgrade = await stateMigrationHelper.getDataFromContract(
  //   stateContract,
  //   id,
  //   stateValue
  // );
  //
  // const defaultIdTypeBefore = await stateContract.getDefaultIdType();
  // const stateOwnerAddressBefore = await stateContract.owner();
  //
  // expect(stateOwnerAddressBefore).to.equal(stateOwnerAddress);
  //
  // const verifierBefore = await stateContract.getVerifier();
  //

  // **** Upgrade State ****
  await stateMigrationHelper.upgradeContract(stateContract);
  // ************************

  //
  // const dataAfterUpgrade = await stateMigrationHelper.getDataFromContract(stateContract, id, stateValue);
  // stateMigrationHelper.checkData(dataBeforeUpgrade, dataAfterUpgrade);
  //
  // const defaultIdTypeAfter = await stateContract.getDefaultIdType();
  // const stateOwnerAddressAfter = await stateContract.owner();
  // const verifierAfter = await stateContract.getVerifier();
  // expect(defaultIdTypeAfter).to.equal(defaultIdTypeBefore);
  // expect(stateOwnerAddressAfter).to.equal(stateOwnerAddressBefore);
  // expect(verifierAfter).to.equal(verifierBefore);
  // expect(stateContract.isIdTypeSupported(defaultIdTypeBefore)).to.be.true;

  console.log("Contract Upgrade Finished");

  // // **** Additional write-read tests (remove in real upgrade) ****
  //       const verifierStubContractName = "Groth16VerifierStub";
  //
  //       const verifierStub = await ethers.deployContract(verifierStubContractName);
  //       await stateContract.connect(stateOwnerSigner).setVerifier(await verifierStub.getAddress());
  //       const oldStateInfo = await stateContract.getStateInfoById(id);
  //
  //       const stateHistoryLengthBefore = await stateContract.getStateInfoHistoryLengthById(id);
  //
  //       const newState = 12345;
  //       await expect(
  //         stateContract.transitState(
  //           id,
  //           oldStateInfo.state,
  //           newState,
  //           false,
  //           [0, 0],
  //           [
  //             [0, 0],
  //             [0, 0],
  //           ],
  //           [0, 0]
  //         )
  //       ).not.to.be.reverted;
  //
  //       const newStateInfo = await stateContract.getStateInfoById(id);
  //       expect(newStateInfo.state).to.equal(newState);
  //       const stateHistoryLengthAfter = await stateContract.getStateInfoHistoryLengthById(id);
  //       expect(stateHistoryLengthAfter).to.equal(stateHistoryLengthBefore.add(1));
  // **********************************
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
