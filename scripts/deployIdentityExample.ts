import fs from "fs";
import path from "path";
import { OnchainIdentityDeployHelper } from "../helpers/OnchainIdentityDeployHelper";
import { DeployHelper } from "../helpers/DeployHelper";
const pathOutputJson = path.join(__dirname, "./deploy_output.json");

async function main() {
    const stDeployHelper = await DeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployState();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smtLib,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4);

    const identity = contracts.identity;


  const outputJson = {
    state: stContracts.state.address,
    smtLib: stContracts.smtLib.address,
    identity: identity.address,
    poseidon1: stContracts.poseidon1.address,
    poseidon2: stContracts.poseidon2.address,
    poseidon3: stContracts.poseidon3.address,
    poseidon4: stContracts.poseidon4.address,
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
