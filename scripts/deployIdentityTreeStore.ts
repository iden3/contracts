import { DeployHelper } from "../helpers/DeployHelper";
import hre, { ethers, network } from "hardhat";
import path from "path";
import fs from "fs";
import { getConfig } from "../helpers/config";

(async () => {
  const config = getConfig();

  const stateContractAddress = config.stateContractAddress;
  if (!ethers.isAddress(stateContractAddress)) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set");
  }
  const poseidon2ContractAddress = config.poseidon2ContractAddress;
  if (!ethers.isAddress(poseidon2ContractAddress)) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set");
  }
  const poseidon3ContractAddress = config.poseidon3ContractAddress;
  if (!ethers.isAddress(poseidon3ContractAddress)) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set");
  }

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const { identityTreeStore } = await deployHelper.deployIdentityTreeStore(
    stateContractAddress,
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    deployStrategy,
  );

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `./deploy_identity_tree_store_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    identityTreeStore: await identityTreeStore.getAddress(),
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    network: networkName,
    chainId,
    deployStrategy,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
})();
