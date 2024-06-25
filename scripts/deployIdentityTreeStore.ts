import { DeployHelper } from "../helpers/DeployHelper";

(async () => {
  const deployHelper = await DeployHelper.initialize();

  const stateContractAddress = process.env.STATE_CONTRACT_ADDRESS || "";
  const poseidon2ContractAddress = process.env.POSEIDON_2_CONTRACT_ADDRESS || "";
  const poseidon3ContractAddress = process.env.POSEIDON_3_CONTRACT_ADDRESS || "";

  await deployHelper.deployIdentityTreeStore(stateContractAddress,
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    'create2');
})();
