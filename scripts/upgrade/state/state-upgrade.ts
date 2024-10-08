import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import { expect } from "chai"; // abi of contract that will be upgraded
import * as stateArtifact from "../../../artifacts/contracts/state/State.sol/State.json";
import { getConfig, isContract, removeLocalhostNetworkIgnitionFiles } from "../../../helpers/helperUtils";
import fs from "fs";
import path from "path";

const config = getConfig();

const chainId = hre.network.config.chainId;
const network = hre.network.name;

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
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }
  if (!(await isContract(config.stateContractAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon1ContractAddress = config.poseidon1ContractAddress;
  if (!(await isContract(poseidon1ContractAddress))) {
    throw new Error("POSEIDON_1_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon2ContractAddress = config.poseidon2ContractAddress;
  if (!(await isContract(poseidon2ContractAddress))) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon3ContractAddress = config.poseidon3ContractAddress;
  if (!(await isContract(poseidon3ContractAddress))) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set or invalid");
  }
  const smtLibContractAddress = config.smtLibContractAddress;
  if (!(await isContract(smtLibContractAddress))) {
    throw new Error("SMT_LIB_CONTRACT_ADDRESS is not set or invalid");
  }
  const { proxyAdminOwnerSigner, stateOwnerSigner } = await getSigners(impersonate);

  const stateDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, stateOwnerSigner],
    true,
  );

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  console.log("State Owner Address: ", await stateOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const stateContract = await ethers.getContractAt(stateArtifact.abi, config.stateContractAddress);
  console.log("Version before: ", await stateContract.VERSION());

  const defaultIdTypeBefore = await stateContract.getDefaultIdType();
  const stateOwnerAddressBefore = await stateContract.owner();

  const poseidonContracts = [
    config.poseidon1ContractAddress,
    config.poseidon2ContractAddress,
    config.poseidon3ContractAddress,
  ];

  const { state, g16Verifier, stateLib, stateCrossChainLib, crossChainProofValidator } =
    await stateDeployHelper.upgradeState(
      await stateContract.getAddress(),
      true,
      true,
      deployStrategy,
      poseidonContracts,
      smtLibContractAddress,
    );

  console.log("Version after: ", await state.VERSION());

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
    verifier: await g16Verifier.getAddress(),
    stateLib: await stateLib.getAddress(),
    smtLib: smtLibContractAddress,
    stateCrossChainLib: await stateCrossChainLib.getAddress(),
    crossChainProofValidator: await crossChainProofValidator.getAddress(),
    poseidon1: poseidon1ContractAddress,
    poseidon2: poseidon2ContractAddress,
    poseidon3: poseidon3ContractAddress,
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
