import fs from "fs";
import path from "path";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import { getConfig } from "../../helpers/helperUtils";
import { DeployHelper } from "../../helpers/DeployHelper";
import { isContract } from "../../helpers/helperUtils";
import { UNIFIED_CONTRACT_ADDRESSES } from "../../helpers/constants";
const pathOutputJson = path.join(__dirname, "./deploy_identity_example_output.json");

async function main() {
  const config = getConfig();
  const stDeployHelper = await DeployHelper.initialize();
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const stateContractAddress = config.stateContractAddress;
  if (!(await isContract(stateContractAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
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
