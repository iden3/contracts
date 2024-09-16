import { DeployHelper } from "../helpers/DeployHelper";
import hre, { network } from "hardhat";
import path from "path";
import fs from "fs";

(async () => {
  const deployHelper = await DeployHelper.initialize();

  const stateContractAddress = process.env.STATE_CONTRACT_ADDRESS || "";
  if (!stateContractAddress) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set");
  }
  const poseidon2ContractAddress = process.env.POSEIDON_2_CONTRACT_ADDRESS || "";
  if (!poseidon2ContractAddress) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set");
  }
  const poseidon3ContractAddress = process.env.POSEIDON_3_CONTRACT_ADDRESS || "";
  if (!poseidon3ContractAddress) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set");
  }

  const { identityTreeStore } = await deployHelper.deployIdentityTreeStore(
    stateContractAddress,
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    "basic",
  );

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `./deploy_identity_tree_store_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    identityTreeStore: await identityTreeStore.getAddress(),
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    network: process.env.HARDHAT_NETWORK,
    chainId,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
})();
