import hre, { ethers } from "hardhat";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { getConfig, isContract, removeLocalhostNetworkIgnitionFiles } from "../../../helpers/helperUtils";
import path from "path";
import fs from "fs";
import { CONTRACT_NAMES } from "../../../helpers/constants";

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
  if (!(await isContract(stateContractAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
  }
  const identityTreeStoreContractAddress = config.identityTreeStoreContractAddress;
  if (!(await isContract(identityTreeStoreContractAddress))) {
    throw new Error("IDENTITY_TREE_STORE_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon2ContractAddress = config.poseidon2ContractAddress;
  if (!(await isContract(poseidon2ContractAddress))) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon3ContractAddress = config.poseidon3ContractAddress;
  if (!(await isContract(poseidon3ContractAddress))) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set or invalid");
  }

  const { proxyAdminOwnerSigner } = await getSigners(impersonate);

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const identityTreeStore = await ethers.getContractAt(
    CONTRACT_NAMES.IDENTITY_TREE_STORE,
    identityTreeStoreContractAddress,
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

  const pathOutputJson = path.join(
    __dirname,
    `../../deployments_output/deploy_identity_tree_store_output_${chainId}_${network}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await proxyAdminOwnerSigner.getAddress(),
    identityTreeStore: await identityTreeStore.getAddress(),
    poseidon2ContractAddress,
    poseidon3ContractAddress,
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
