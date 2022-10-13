import { StateDeployHelper } from "../helpers/StateDeployHelper";

async function main() {
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);

  if (!process.env.STATE_CONTRACT_ADDRESS) {
    throw new Error("Please set STATE_CONTRACT_ADDRESS env variable");
  }
  await stateDeployHelper.migrateFromStateV1toV2(
    process.env.STATE_CONTRACT_ADDRESS,
    0,
    3500
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
