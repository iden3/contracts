import fs from "fs";
import path from "path";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import {
  networks,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  contractsInfo,
} from "../../helpers/constants";
const pathOutputJson = path.join(__dirname, "./deploy_identity_example_output.json");
import hre from "hardhat";

async function main() {
  const stDeployHelper = await DeployHelper.initialize();
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const chainId = hre.network.config.chainId;

  let stateContractAddress = contractsInfo.STATE.unifiedAddress;
  if (chainId === networks.POLYGON_AMOY.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === networks.POLYGON_MAINNET.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }

  const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();

  const contracts = await identityDeployHelper.deployIdentity(
    stateContractAddress,
    contractsInfo.SMT_LIB.unifiedAddress,
    contractsInfo.POSEIDON_3.unifiedAddress,
    contractsInfo.POSEIDON_4.unifiedAddress,
    defaultIdType,
  );

  const identity = contracts.identity;

  const outputJson = {
    state: stateContractAddress,
    smtLib: contractsInfo.SMT_LIB.unifiedAddress,
    identity: await identity.getAddress(),
    poseidon1: contractsInfo.POSEIDON_1.unifiedAddress,
    poseidon2: contractsInfo.POSEIDON_2.unifiedAddress,
    poseidon3: contractsInfo.POSEIDON_3.unifiedAddress,
    poseidon4: contractsInfo.POSEIDON_4.unifiedAddress,
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
