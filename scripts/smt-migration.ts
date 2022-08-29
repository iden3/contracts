import { SmtStateMigration } from "./smt-state-migration";
import { deployPoseidons } from "../test/deploy-utils";
const { ethers } = require("hardhat");

async function main() {
  /* to run script:
  npx hardhat run --network mumbai scripts/smt-deploy.ts
  */
  const [owner] = await ethers.getSigners();
  const { poseidon2Elements, poseidon3Elements } = await deployPoseidons(owner);

  await new SmtStateMigration(true).run(
    "<state address>", // put your State smart contract address here !!!
    poseidon2Elements.address,
    poseidon3Elements.address,
    0, // put your block here. Normally, this should be the block of the previous State contract version deployment
    3500 // blocks chunk size
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
