import hre, { ethers } from "hardhat";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { getConfig, removeLocalhostNetworkIgnitionFiles } from "../../../helpers/helperUtils";
import path from "path";
import fs from "fs";
import {
  CHAIN_IDS,
  CONTRACT_NAMES,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../../helpers/constants";

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

  let stateContractAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
  if (chainId === CHAIN_IDS.POLYGON_AMOY) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === CHAIN_IDS.POLYGON_MAINNET) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }

  const { proxyAdminOwnerSigner } = await getSigners(impersonate);

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const identityTreeStore = await ethers.getContractAt(
    CONTRACT_NAMES.IDENTITY_TREE_STORE,
    UNIFIED_CONTRACT_ADDRESSES.IDENTITY_TREE_STORE,
  );

  console.log("Version before:", await identityTreeStore.VERSION());
  // **** Upgrade IdentityTreeStore ****

  const stateDeployHelper = await DeployHelper.initialize([proxyAdminOwnerSigner], true);

  await stateDeployHelper.upgradeIdentityTreeStore(
    UNIFIED_CONTRACT_ADDRESSES.IDENTITY_TREE_STORE,
    stateContractAddress,
    UNIFIED_CONTRACT_ADDRESSES.POSEIDON_2,
    UNIFIED_CONTRACT_ADDRESSES.POSEIDON_3,
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
    poseidon2ContractAddress: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_2,
    poseidon3ContractAddress: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_3,
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
