import fs from "fs";
import path from "path";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import {
  CHAIN_IDS,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../helpers/constants";
const pathOutputJson = path.join(__dirname, "./deploy_identity_example_output.json");
import hre from "hardhat";

async function main() {
  const stDeployHelper = await DeployHelper.initialize();
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const chainId = hre.network.config.chainId;

  let stateContractAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
  if (chainId === CHAIN_IDS.POLYGON_AMOY) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === CHAIN_IDS.POLYGON_MAINNET) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }

  const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
  const [poseidon4Elements] = await deployPoseidons([4]);

  const contracts = await identityDeployHelper.deployIdentity(
    stateContractAddress,
    UNIFIED_CONTRACT_ADDRESSES.SMT_LIB,
    UNIFIED_CONTRACT_ADDRESSES.POSEIDON_3,
    await poseidon4Elements.getAddress(),
    defaultIdType,
  );

  const identity = contracts.identity;

  const outputJson = {
    state: stateContractAddress,
    smtLib: UNIFIED_CONTRACT_ADDRESSES.SMT_LIB,
    identity: await identity.getAddress(),
    poseidon1: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_1,
    poseidon2: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_2,
    poseidon3: UNIFIED_CONTRACT_ADDRESSES.POSEIDON_3,
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
