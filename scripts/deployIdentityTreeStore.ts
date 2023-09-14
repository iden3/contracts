import { DeployHelper } from "../helpers/DeployHelper";
import { Contract } from "ethers";
import { poseidon } from "@iden3/js-crypto";

(async () => {
  const deployHelper = await DeployHelper.initialize();
  let stateContract, identityTreeStore: Contract;

  // Put your state contract address instead !!!!!!!!!!!
  // eslint-disable-next-line prefer-const
  ({ state: stateContract } = await deployHelper.deployState());
  const stateContractAddress = stateContract.address;

  // eslint-disable-next-line prefer-const
  ({ identityTreeStore } = await deployHelper.deployIdentityTreeStore(stateContractAddress));

  // change to your root values and add more states / genesis states if you need !!!!!!!
  const claimsRoot = 1n;
  const revRoot = 2n;
  const rootOfRoots = 3n;
  const roots = [
    [claimsRoot, revRoot, rootOfRoots]
  ];
  await identityTreeStore.addNodes(roots);

  const expectedState = poseidon.hash(roots[0]);
  console.log("Expected state: ", expectedState);

  const nonce = 1n;
  const id = 1n;
  console.log(
    "Revocation status: ",
    await identityTreeStore.getRevocationStatusByIdAndState(id, expectedState, nonce)
  );
})();
