import { StateDeployHelper } from "../helpers/StateDeployHelper";

async function main() {
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);

  if (!process.env.STATE_CONTRACT_ADDRESS) {
    throw new Error("Please set STATE_CONTRACT_ADDRESS env variable");
  }

  const firstEventBlock = parseInt(process.env.FIRST_EVENT_BLOCK || "");
  if (isNaN(firstEventBlock)) {
    throw new Error("Please set START_BLOCK_NUMBER env variable");
  }

  const eventsChunkSize = parseInt(process.env.EVENTS_CHUNK_SIZE || "");
  if (isNaN(eventsChunkSize)) {
    throw new Error("Please set BLOCK_CHUNK_SIZE env variable");
  }

  await stateDeployHelper.migrateFromStateV1toV2(
    process.env.STATE_CONTRACT_ADDRESS,
    firstEventBlock,
    eventsChunkSize
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
