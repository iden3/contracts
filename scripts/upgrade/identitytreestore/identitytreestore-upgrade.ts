import hre, { ethers } from "hardhat";
import { DeployHelper } from "../../../helpers/DeployHelper";
import {
  getChainId,
  getConfig,
  getStateContractAddress,
  removeLocalhostNetworkIgnitionFiles,
  verifyContract,
} from "../../../helpers/helperUtils";
import path from "path";
import fs from "fs";
import { contractsInfo } from "../../../helpers/constants";

const removePreviousIgnitionFiles = true;
const impersonate = false;

const config = getConfig();

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
  const chainId = await getChainId();
  const network = hre.network.name;

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }

  const stateContractAddress = await getStateContractAddress();

  const { proxyAdminOwnerSigner } = await getSigners(impersonate);

  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const identityTreeStore = await ethers.getContractAt(
    contractsInfo.IDENTITY_TREE_STORE.name,
    contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
  );

  console.log("Version before:", await identityTreeStore.VERSION());
  // **** Upgrade IdentityTreeStore ****

  const stateDeployHelper = await DeployHelper.initialize([proxyAdminOwnerSigner], true);

  await stateDeployHelper.upgradeIdentityTreeStore(
    contractsInfo.IDENTITY_TREE_STORE.unifiedAddress,
    stateContractAddress,
    contractsInfo.POSEIDON_2.unifiedAddress,
    contractsInfo.POSEIDON_3.unifiedAddress,
    deployStrategy,
  );

  // **********************************
  console.log("Version after:", await identityTreeStore.VERSION());

  await verifyContract(
    await identityTreeStore.getAddress(),
    contractsInfo.IDENTITY_TREE_STORE.verificationOpts,
  );

  const pathOutputJson = path.join(
    __dirname,
    `../../deployments_output/deploy_identity_tree_store_output_${chainId}_${network}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await proxyAdminOwnerSigner.getAddress(),
    identityTreeStore: await identityTreeStore.getAddress(),
    poseidon2ContractAddress: contractsInfo.POSEIDON_2.unifiedAddress,
    poseidon3ContractAddress: contractsInfo.POSEIDON_3.unifiedAddress,
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
