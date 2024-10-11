import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { ethers, network } from "hardhat";
import path from "path";
import fs from "fs";
import { getConfig, isContract } from "../../helpers/helperUtils";
import {
  networks,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  contractsInfo,
} from "../../helpers/constants";

(async () => {
  const config = getConfig();

  const chainId = hre.network.config.chainId;

  let stateContractAddress = contractsInfo.STATE.unifiedAddress;
  if (chainId === networks.POLYGON_AMOY.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === networks.POLYGON_MAINNET.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const { identityTreeStore } = await deployHelper.deployIdentityTreeStore(
    stateContractAddress,
    contractsInfo.POSEIDON_2.unifiedAddress,
    contractsInfo.POSEIDON_3.unifiedAddress,
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
    poseidon2ContractAddress: contractsInfo.POSEIDON_2.unifiedAddress,
    poseidon3ContractAddress: contractsInfo.POSEIDON_3.unifiedAddress,
    network: networkName,
    chainId,
    deployStrategy,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
})();
