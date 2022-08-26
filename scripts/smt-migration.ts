import { SmtStateMigration } from "./smt-state-migration";

async function main() {
  /* to run script:
  npx hardhat run --network mumbai scripts/smt-deploy.ts
  */
  await new SmtStateMigration(true).run(
    "<state address>",
    "<poseidon2 address>",
    "<poseidon3 address>",
    27573663, // start block
    3500 // blocks chunk size
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
