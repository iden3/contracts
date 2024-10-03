import hre, { ethers } from "hardhat";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { poseidon } from "@iden3/js-crypto";
import { expect } from "chai";
import { getConfig, removeLocalhostNetworkIgnitionFiles } from "../../../helpers/helperUtils";

// Polygon Mumbai

const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
const removePreviousIgnitionFiles = true;
const impersonate = false;

const config = getConfig();
const chainId = hre.network.config.chainId;
const network = hre.network.name;

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(config.ledgerAccount);
    return { proxyAdminOwnerSigner };
  } else {
    const [signer] = await ethers.getSigners();
    const proxyAdminOwnerSigner = signer;
    return { proxyAdminOwnerSigner };
  }
}

async function main() {
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }
  const stateContractAddress = config.stateContractAddress;
  if (!ethers.isAddress(stateContractAddress)) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set");
  }
  const identityTreeStoreContractAddress = config.identityTreeStoreContractAddress;
  if (!ethers.isAddress(identityTreeStoreContractAddress)) {
    throw new Error("IDENTITY_TREE_STORE_CONTRACT_ADDRESS is not set");
  }
  const poseidon2ContractAddress = config.poseidon2ContractAddress;
  if (!ethers.isAddress(poseidon2ContractAddress)) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set");
  }
  const poseidon3ContractAddress = config.poseidon3ContractAddress;
  if (!ethers.isAddress(poseidon3ContractAddress)) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set");
  }

  const { proxyAdminOwnerSigner } = await getSigners(impersonate);

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const identityTreeStore = await ethers.getContractAt(
    "IdentityTreeStore",
    identityTreeStoreContractAddress,
  );

  // **** Write data before upgrade (to be deleted in real upgrade) ****
  let nonce = 1n;
  let revRoot = poseidon.hash([nonce, 0n, 1n]);
  let preimages = [
    [1n, revRoot, 3n],
    [nonce, 0n, 1n],
  ];
  let state = poseidon.hash(preimages[0]);

  await identityTreeStore.saveNodes(preimages);

  // **********************************

  const revStatusByStateBefore = await identityTreeStore.getRevocationStatusByIdAndState(
    id,
    state,
    nonce,
  );

  console.log("Version before:", await identityTreeStore.VERSION());
  // **** Upgrade IdentityTreeStore ****

  const stateDeployHelper = await DeployHelper.initialize([proxyAdminOwnerSigner], true);

  await stateDeployHelper.upgradeIdentityTreeStore(
    identityTreeStoreContractAddress,
    stateContractAddress,
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    deployStrategy,
  );

  // **********************************
  console.log("Version after:", await identityTreeStore.VERSION());

  const revStatusByStateAfter = await identityTreeStore.getRevocationStatusByIdAndState(
    id,
    state,
    nonce,
  );

  expect(revStatusByStateBefore).to.deep.equal(revStatusByStateAfter);

  // **** Additional read-write checks (to be deleted before real upgrade) ****

  nonce = 2n;
  revRoot = poseidon.hash([nonce, 0n, 1n]);
  preimages = [
    [1n, revRoot, 3n],
    [nonce, 0n, 1n],
  ];
  state = poseidon.hash(preimages[0]);

  await identityTreeStore.saveNodes(preimages);

  const revStatusByState = await identityTreeStore.getRevocationStatusByIdAndState(
    id,
    state,
    nonce,
  );

  expect(revStatusByState.issuer.state).to.equal(state);
  expect(revStatusByState.issuer.claimsTreeRoot).to.equal(1n);
  expect(revStatusByState.issuer.revocationTreeRoot).to.equal(revRoot);
  expect(revStatusByState.issuer.rootOfRoots).to.equal(3n);
  expect(revStatusByState.mtp.root).to.equal(revRoot);
  expect(revStatusByState.mtp.existence).to.equal(true);

  // **************************************
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
