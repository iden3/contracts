import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import StateModule from "./state";
import { PoseidonHasherModule } from "./libraries";

const IdentityTreeStoreImplementationModule = buildModule(
  "IdentityTreeStoreImplementationModule",
  (m) => {
    const { poseidonHasher } = m.useModule(PoseidonHasherModule);
    const state = m.useModule(StateModule).state;

    const implementation = m.contract(contractsInfo.IDENTITY_TREE_STORE.name, []);
    return { implementation, state, poseidonHasher };
  },
);

const IdentityTreeStoreProxyModule = buildModule("IdentityTreeStoreProxyModule", (m) => {
  const { implementation, state, poseidonHasher } = m.useModule(
    IdentityTreeStoreImplementationModule,
  );

  const proxyAdminOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [
    state,
    poseidonHasher,
  ]);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [implementation, proxyAdminOwner, initializeData],
  );

  return { proxy, state, implementation };
});

const IdentityTreeStoreModule = buildModule("IdentityTreeStoreModule", (m) => {
  const { proxy, state, implementation } = m.useModule(IdentityTreeStoreProxyModule);
  const identityTreeStore = m.contractAt(contractsInfo.IDENTITY_TREE_STORE.name, proxy);
  return { identityTreeStore, state, implementation };
});

export default IdentityTreeStoreModule;
