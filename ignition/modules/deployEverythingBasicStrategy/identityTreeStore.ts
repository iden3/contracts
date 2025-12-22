import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Poseidon2Module, Poseidon3Module } from "./libraries";
import StateModule from "./state";

const IdentityTreeStoreImplementationModule = buildModule(
  "IdentityTreeStoreImplementationModule",
  (m) => {
    const poseidon2 = m.useModule(Poseidon2Module).poseidon;
    const poseidon3 = m.useModule(Poseidon3Module).poseidon;
    const state = m.useModule(StateModule).state;

    const implementation = m.contract(contractsInfo.IDENTITY_TREE_STORE.name, [], {
      libraries: {
        PoseidonUnit2L: poseidon2,
        PoseidonUnit3L: poseidon3,
      },
    });
    return { implementation, state };
  },
);

const IdentityTreeStoreProxyModule = buildModule("IdentityTreeStoreProxyModule", (m) => {
  const { implementation, state } = m.useModule(IdentityTreeStoreImplementationModule);

  const proxyAdminOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [state]);

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
