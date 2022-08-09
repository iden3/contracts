import bre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { deployContracts, publishState } from "../../test/deploy-utils";

async function main() {
  // compìle contracts
  await bre.run("compile");
  const contracts = await deployContracts();
  const state = contracts.state;
  const smt = contracts.smt;
  for (const issuerStateJson of [
    require("../mtp/data/issuer_state_transition.json"),
    require("../mtp/data/issuer_next_state_transition.json"),
  ]) {
    await publishState(state, issuerStateJson);
  }

  const rootHistoryLength = await smt.rootHistoryLength();

  await smt.getRootHistory(0, rootHistoryLength - 1);

  // upgrade smt by proxy
  const smtV2Factory = await ethers.getContractFactory("SmtV2Mock");

  await upgrades.upgradeProxy(smt.address, smtV2Factory);

  const smtV2Contract = smtV2Factory.attach(smt.address);
  await smtV2Contract.setTestMapValue(1, 2022);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
