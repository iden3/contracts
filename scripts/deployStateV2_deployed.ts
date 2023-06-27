import { DeployHelper } from "../helpers/DeployHelper";

async function main() {
    const stDeployHelper = await DeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2('VerifierV2', 'StateV2_deployed', true);
    console.log('Old state address: ' + stContracts.state.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
