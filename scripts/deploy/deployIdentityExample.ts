import fs from "fs";
import path from "path";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { DeployHelper } from "../../helpers/DeployHelper";
import { contractsInfo } from "../../helpers/constants";
const pathOutputJson = path.join(__dirname, "./deploy_identity_example_output.json");
import { getStateContractAddress } from "../../helpers/helperUtils";

async function main() {
  const stDeployHelper = await DeployHelper.initialize();
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const stateContractAddress = await getStateContractAddress();

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
