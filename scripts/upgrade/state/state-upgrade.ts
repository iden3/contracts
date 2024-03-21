import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { StateContractMigrationHelper } from "../../../helpers/StateContractMigrationHelper";
import { expect } from "chai"; // abi of contract that will be upgraded

import * as stateArtifact from "../../../artifacts/contracts/state/State.sol/State.json";

const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
const stateValue = "0x2c68da47bf4c9acb3320076513905f7b63d8070ed8276ad16ca5402b267a7c26";

const proxyAdminContractAddress = "0x09bCEf4386D6c19BDb24a85e5C60adEc6921701a";
const proxyAdminOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";

const stateContractAddress = "0x134B1BE34911E39A8397ec6289782989729807a4";
const stateOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";

async function main() {
  const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(proxyAdminOwnerAddress);
  const stateOwnerSigner = await ethers.getImpersonatedSigner(stateOwnerAddress);

  const stateDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, stateOwnerSigner],
    true
  );

  const migrationHelper = new StateContractMigrationHelper(
    stateDeployHelper,
    proxyAdminOwnerSigner
  );

  const stateContract = await migrationHelper.getInitContract({
    contractNameOrAbi: stateArtifact.abi,
    address: stateContractAddress,
  });

  const dataBeforeUpgrade = await migrationHelper.getDataFromContract(
    stateContract,
    id,
    stateValue
  );

  const defaultIdTypeBefore = await stateContract.getDefaultIdType();
  const stateOwnerAddressBefore = await stateContract.owner();

  expect(stateOwnerAddressBefore).to.equal(stateOwnerAddress);

  await migrationHelper.upgradeContract(stateContract);
  const dataAfterUpgrade = await migrationHelper.getDataFromContract(stateContract, id, stateValue);
  migrationHelper.checkData(dataBeforeUpgrade, dataAfterUpgrade);

  const defaultIdTypeAfter = await stateContract.getDefaultIdType();
  const stateOwnerAddressAfter = await stateContract.owner();
  expect(defaultIdTypeAfter).to.equal(defaultIdTypeBefore);
  expect(stateOwnerAddressAfter).to.equal(stateOwnerAddressBefore);

  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
