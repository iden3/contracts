import fs from "fs";
import path from "path";
import { OnchainIdentityDeployHelper } from "../helpers/OnchainIdentityDeployHelper";
import { DeployHelper } from "../helpers/DeployHelper";
import { deployPoseidons } from "../helpers/PoseidonDeployHelper";
const pathOutputJson = path.join(__dirname, "./deploy_identity_example_output.json");

async function main() {
  const stDeployHelper = await DeployHelper.initialize();
  const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
  const [poseidon1Elements, poseidon2Elements, poseidon3Elements, poseidon4Elements] =
    await deployPoseidons([1, 2, 3, 4]);

  const stContracts = await stDeployHelper.deployState(
    [],
    "Groth16VerifierStateTransition",
    "basic",
    [poseidon1Elements, poseidon2Elements, poseidon3Elements],
  );
  const contracts = await identityDeployHelper.deployIdentity(
    stContracts.state,
    stContracts.smtLib,
    poseidon3Elements,
    poseidon4Elements,
    stContracts.defaultIdType,
  );

  const identity = contracts.identity;

  const outputJson = {
    state: await stContracts.state.getAddress(),
    smtLib: await stContracts.smtLib.getAddress(),
    identity: await identity.getAddress(),
    poseidon1: poseidon1Elements.getAddress(),
    poseidon2: poseidon2Elements.getAddress(),
    poseidon3: poseidon3Elements.getAddress(),
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
