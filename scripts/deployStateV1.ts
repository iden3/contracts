import { StateDeployHelper } from "../helpers/StateDeployHelper";

async function main() {
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);
  await stateDeployHelper.deployStateV1();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
