import { DeployHelper } from "../helpers/DeployHelper";

(async () => {
  const deployHelper = await DeployHelper.initialize();

  const stateContractAddress = process.env.STATE_CONTRACT_ADDRESS || "0xdc2A724E6bd60144Cde9DEC0A38a26C619d84B90";

  await deployHelper.deployIdentityTreeStore(stateContractAddress);
})();
