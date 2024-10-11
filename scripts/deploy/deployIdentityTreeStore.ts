import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { ethers, network } from "hardhat";
import path from "path";
import fs from "fs";
import { getConfig, isContract } from "../../helpers/helperUtils";
import {
  CHAIN_IDS,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../helpers/constants";

(async () => {
  const config = getConfig();

  const chainId = hre.network.config.chainId;

  let stateContractAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
  if (chainId === CHAIN_IDS.POLYGON_AMOY) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === CHAIN_IDS.POLYGON_MAINNET) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const { identityTreeStore } = await deployHelper.deployIdentityTreeStore(
    stateContractAddress,
    UNIFIED_CONTRACT_ADDRESSES.POSEIDON_2,
    UNIFIED_CONTRACT_ADDRESSES.POSEIDON_3,
    deployStrategy,
  );

  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_identity_tree_store_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    identityTreeStore: await identityTreeStore.getAddress(),
    poseidon2ContractAddress: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_2,
    poseidon3ContractAddress: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_3,
    network: networkName,
    chainId,
    deployStrategy,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
})();
