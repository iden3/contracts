import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import {
  Create2AddressAnchorAtModule,
  IdentityTreeStoreAtModule,
  IdentityTreeStoreNewImplementationAtModule,
  Poseidon2AtModule,
  Poseidon3AtModule,
  StateAtModule,
} from "./contractsAt";

const IdentityTreeStoreProxyFirstImplementationModule = buildModule(
  "IdentityTreeStoreProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getParameter("proxyAdminOwner");

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.
    const create2AddressAnchor = m.useModule(Create2AddressAnchorAtModule).contract;

    const proxy = m.contract(
      "TransparentUpgradeableProxy",
      {
        abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
        contractName: "TransparentUpgradeableProxy",
        bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
        sourceName: "",
        linkReferences: {},
      },
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.IDENTITY_TREE_STORE.create2Calldata],
    );
    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    return { proxyAdmin, proxy };
  },
);

export const IdentityTreeStoreFinalImplementationModule = buildModule(
  "IdentityTreeStoreFinalImplementationModule",
  (m) => {
    const poseidon2 = m.useModule(Poseidon2AtModule).contract;
    const poseidon3 = m.useModule(Poseidon3AtModule).contract;
    const state = m.useModule(StateAtModule).proxy;

    const newImplementation = m.contract(contractsInfo.IDENTITY_TREE_STORE.name, [], {
      libraries: {
        PoseidonUnit2L: poseidon2,
        PoseidonUnit3L: poseidon3,
      },
    });

    return {
      poseidon2,
      poseidon3,
      state,
      newImplementation,
    };
  },
);

export const IdentityTreeStoreProxyModule = buildModule("IdentityTreeStoreProxyModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(IdentityTreeStoreProxyFirstImplementationModule);
  const { poseidon2, poseidon3, state, newImplementation } = m.useModule(
    IdentityTreeStoreFinalImplementationModule,
  );
  return {
    poseidon2,
    poseidon3,
    state,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

const IdentityTreeStoreProxyFinalImplementationModule = buildModule(
  "IdentityTreeStoreProxyFinalImplementationModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(IdentityTreeStoreAtModule);
    const poseidon2 = m.useModule(Poseidon2AtModule).contract;
    const poseidon3 = m.useModule(Poseidon3AtModule).contract;
    const state = m.useModule(StateAtModule).proxy;
    const { contract: newImplementation } = m.useModule(IdentityTreeStoreNewImplementationAtModule);

    const proxyAdminOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [state]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      poseidon2,
      poseidon3,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const IdentityTreeStoreModule = buildModule("IdentityTreeStoreModule", (m) => {
  const { poseidon2, poseidon3, state, newImplementation, proxyAdmin, proxy } = m.useModule(
    IdentityTreeStoreProxyFinalImplementationModule,
  );

  const identityTreeStore = m.contractAt(contractsInfo.IDENTITY_TREE_STORE.name, proxy);

  return {
    identityTreeStore,
    poseidon2,
    poseidon3,
    state,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default IdentityTreeStoreModule;
