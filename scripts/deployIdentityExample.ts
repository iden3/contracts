import fs from "fs";
import path from "path";
import hre, { ethers, network } from "hardhat";
import { OnchainIdentityDeployHelper } from "../helpers/OnchainIdentityDeployHelper";
import { deployPoseidons } from "../helpers/PoseidonDeployHelper";
import { getConfig } from "../helpers/helperUtils";
import { DeployHelper } from "../helpers/DeployHelper";
const pathOutputJson = path.join(__dirname, "./deploy_identity_example_output.json");

async function main() {
  const config = getConfig();
  const stDeployHelper = await DeployHelper.initialize();
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const stateContractAddress = config.stateContractAddress;
  if (!ethers.isAddress(stateContractAddress)) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set");
  }
  const smtLibContractAddress = config.smtLibContractAddress;
  if (!ethers.isAddress(smtLibContractAddress)) {
    throw new Error("SMT_LIB_CONTRACT_ADDRESS is not set");
  }
  const poseidon1ContractAddress = config.poseidon1ContractAddress;
  if (!ethers.isAddress(poseidon1ContractAddress)) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set");
  }
  const poseidon2ContractAddress = config.poseidon2ContractAddress;
  if (!ethers.isAddress(poseidon2ContractAddress)) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set");
  }
  const poseidon3ContractAddress = config.poseidon3ContractAddress;
  if (!ethers.isAddress(poseidon3ContractAddress)) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set");
  }

  const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
  const [poseidon4Elements] = await deployPoseidons([4]);

  const contracts = await identityDeployHelper.deployIdentity(
    stateContractAddress,
    smtLibContractAddress,
    poseidon3ContractAddress,
    await poseidon4Elements.getAddress(),
    defaultIdType,
  );

  const identity = contracts.identity;

  const outputJson = {
    state: stateContractAddress,
    smtLib: smtLibContractAddress,
    identity: await identity.getAddress(),
    poseidon1: poseidon1ContractAddress,
    poseidon2: poseidon2ContractAddress,
    poseidon3: poseidon3ContractAddress,
    poseidon4: poseidon4Elements.getAddress(),
    network: process.env.HARDHAT_NETWORK,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
