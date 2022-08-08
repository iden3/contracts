import bre from "hardhat";
import { ethers, upgrades } from "hardhat";

async function main() {
  // compìle contracts
  await bre.run("compile");

  const stateV2Facotry = await ethers.getContractFactory("StateV2Mock");
  const StateAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  // Upgrade
  const tx = await upgrades.upgradeProxy(StateAddress, stateV2Facotry);

  console.log(tx.deployTransaction);
  console.log("upgrade succesfull");

  const stateV2Contract = stateV2Facotry.attach(StateAddress);
  const version = await stateV2Contract.version();
  await stateV2Contract.setVersion();
  const version2 = await stateV2Contract.version();

  console.log(version, version2);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
