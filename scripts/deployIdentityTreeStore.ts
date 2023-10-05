import { DeployHelper } from "../helpers/DeployHelper";

(async () => {
  const deployHelper = await DeployHelper.initialize();

  const stateContractAddress = process.env.STATE_CONTRACT_ADDRESS || "";

  await deployHelper.deployIdentityTreeStore(stateContractAddress);
})();
