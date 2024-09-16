import { DeployHelper } from "../helpers/DeployHelper";

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

  await deployHelper.deployIdentityTreeStore(
    stateContractAddress,
    poseidon2ContractAddress,
    poseidon3ContractAddress,
    "basic",
  );
})();
