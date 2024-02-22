import { DeployHelper } from "../helpers/DeployHelper";
import dotenv from 'dotenv';

(async () => {
  dotenv.config();

  const deployHelper = await DeployHelper.initialize();

  const stateContractAddress = process.env.STATE_CONTRACT_ADDRESS as string;

  await deployHelper.deployIdentityTreeStore(stateContractAddress);
})();
