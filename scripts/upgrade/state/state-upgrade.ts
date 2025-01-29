import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import { expect } from "chai"; // abi of contract that will be upgraded
import * as stateArtifact from "../../../artifacts/contracts/state/State.sol/State.json";
import {
  checkContractVersion,
  getChainId,
  getConfig,
  getStateContractAddress,
  removeLocalhostNetworkIgnitionFiles,
  verifyContract,
} from "../../../helpers/helperUtils";
import fs from "fs";
import path from "path";
import { contractsInfo } from "../../../helpers/constants";

const config = getConfig();

const removePreviousIgnitionFiles = true;
const impersonate = false;

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(config.ledgerAccount);
    const stateOwnerSigner = await ethers.getImpersonatedSigner(config.ledgerAccount);
    return { proxyAdminOwnerSigner, stateOwnerSigner };
  } else {
    const [signer] = await ethers.getSigners();
    const proxyAdminOwnerSigner = signer;
    const stateOwnerSigner = signer;

    return { proxyAdminOwnerSigner, stateOwnerSigner };
  }
}

async function main() {
  const chainId = await getChainId();
  const network = hre.network.name;

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }

  const stateContractAddress = await getStateContractAddress();
  const { proxyAdminOwnerSigner, stateOwnerSigner } = await getSigners(impersonate);

  const stateDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, stateOwnerSigner],
    true,
  );

  const { upgraded, currentVersion } = await checkContractVersion(
    contractsInfo.STATE.name,
    stateContractAddress,
    contractsInfo.STATE.version,
  );

  if (upgraded) {
    console.log(`Contract is already upgraded to version ${contractsInfo.STATE.version}`);
    return;
  } else {
    console.log(
      `Contract is not upgraded and will upgrade version ${currentVersion} to ${contractsInfo.STATE.version}`,
    );
  }

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  console.log("State Owner Address: ", await stateOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const stateContract = await ethers.getContractAt(stateArtifact.abi, stateContractAddress);
  console.log("Version before: ", await stateContract.VERSION());

  const defaultIdTypeBefore = await stateContract.getDefaultIdType();
  const stateOwnerAddressBefore = await stateContract.owner();

  const { state, stateLib, stateCrossChainLib, crossChainProofValidator } =
    await stateDeployHelper.upgradeState(
      await stateContract.getAddress(),
      true,
      contractsInfo.SMT_LIB.unifiedAddress,
      contractsInfo.POSEIDON_1.unifiedAddress,
    );

  console.log("Version after: ", await state.VERSION());

  await verifyContract(await state.getAddress(), contractsInfo.STATE.verificationOpts);
  await verifyContract(await stateLib.getAddress(), contractsInfo.STATE_LIB.verificationOpts);
  await verifyContract(
    await stateCrossChainLib.getAddress(),
    contractsInfo.STATE_CROSS_CHAIN_LIB.verificationOpts,
  );
  await verifyContract(
    await crossChainProofValidator.getAddress(),
    contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.verificationOpts,
  );

  const defaultIdTypeAfter = await state.getDefaultIdType();
  const stateOwnerAddressAfter = await state.owner();

  expect(defaultIdTypeAfter).to.equal(defaultIdTypeBefore);
  expect(stateOwnerAddressAfter).to.equal(stateOwnerAddressBefore);

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

  const pathOutputJson = path.join(
    __dirname,
    `../../deployments_output/deploy_state_output_${chainId}_${network}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await proxyAdminOwnerSigner.getAddress(),
    state: await state.getAddress(),
    verifier: contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.unifiedAddress,
    stateLib: await stateLib.getAddress(),
    smtLib: contractsInfo.SMT_LIB.unifiedAddress,
    stateCrossChainLib: await stateCrossChainLib.getAddress(),
    crossChainProofValidator: await crossChainProofValidator.getAddress(),
    poseidon1: contractsInfo.POSEIDON_1.unifiedAddress,
    poseidon2: contractsInfo.POSEIDON_2.unifiedAddress,
    poseidon3: contractsInfo.POSEIDON_3.unifiedAddress,
    network: network,
    chainId,
    deployStrategy,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
