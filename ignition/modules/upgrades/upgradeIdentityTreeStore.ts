import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";
import { Poseidon2AtModule, Poseidon3AtModule } from "../contractsAt";

const version = "V".concat(
  contractsInfo.IDENTITY_TREE_STORE.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeIdentityTreeStoreModule = buildModule(
  "UpgradeIdentityTreeStoreModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.IDENTITY_TREE_STORE.name, proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const poseidon2ContractAddress = m.getParameter("poseidon2ContractAddress");
    const poseidon2 = m.contractAt(contractsInfo.POSEIDON_2.name, poseidon2ContractAddress);
    const poseidon3ContractAddress = m.getParameter("poseidon3ContractAddress");
    const poseidon3 = m.contractAt(contractsInfo.POSEIDON_3.name, poseidon3ContractAddress);

    const newImplementation = m.contract(contractsInfo.IDENTITY_TREE_STORE.name, [], {
      libraries: {
        PoseidonUnit2L: poseidon2,
        PoseidonUnit3L: poseidon3,
      },
    });

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      identityTreeStore: proxy,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeIdentityTreeStoreModule;
