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
    state: await stContracts.state.getAddress(),
    smtLib: await stContracts.smtLib.getAddress(),
    identity: await identity.getAddress(),
    poseidon1: await stContracts.poseidon1.getAddress(),
    poseidon2: await stContracts.poseidon2.getAddress(),
    poseidon3: await stContracts.poseidon3.getAddress(),
    poseidon4: await stContracts.poseidon4.getAddress(),
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
