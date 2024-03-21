import { ethers } from "hardhat";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { poseidon } from "@iden3/js-crypto";
import { expect } from "chai";

const proxyAdminContractAddress = "0x09bCEf4386D6c19BDb24a85e5C60adEc6921701a";
const proxyAdminOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";
const itsOwnerAddress = "0x0ef20f468D50289ed0394Ab34d54Da89DBc131DE";

const stateContractAddress = "0x134B1BE34911E39A8397ec6289782989729807a4";
const identityTreeStoreContractAddress = "0x16A1ae4c460C0a42f0a87e69c526c61599B28BC9";

async function main() {
  const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(proxyAdminOwnerAddress);
  const itsOwnerSigner = await ethers.getImpersonatedSigner(itsOwnerAddress);

  const identityTreeStore = await ethers.getContractAt(
    "IdentityTreeStore",
    identityTreeStoreContractAddress
  );

  // Saving data before upgrade
  const id = "0x000b9921a67e1b1492902d04d9b5c521bee1288f530b14b10a6a8c94ca741201";
  const nonce = 1n;
  const revRoot = poseidon.hash([nonce, 0n, 1n]);
  const preimages = [
    [1n, revRoot, 3n],
    [nonce, 0n, 1n],
  ];
  const state = poseidon.hash(preimages[0]);

  await identityTreeStore.saveNodes(preimages);

  const stateDeployHelper = await DeployHelper.initialize(
    [proxyAdminOwnerSigner, itsOwnerSigner],
    true
  );

  const revStatusByStateBefore = await identityTreeStore.getRevocationStatusByIdAndState(
    id,
    state,
    nonce
  );

  // TODO why this does not work?
  // const revStatusById = await identityTreeStore.getRevocationStatus(id, nonce);

  // **** Upgrade IdentityTreeStore ****
  await stateDeployHelper.upgradeIdentityTreeStore(
    identityTreeStoreContractAddress,
    stateContractAddress
  );
  // **********************************

  const revStatusByStateAfter = await identityTreeStore.getRevocationStatusByIdAndState(
    id,
    state,
    nonce
  );

  const itsOwnerAfter = await identityTreeStore.owner();

  expect(revStatusByStateBefore).to.deep.equal(revStatusByStateAfter);
  expect(itsOwnerAfter).to.equal(itsOwnerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
