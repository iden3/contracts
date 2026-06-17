import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

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

    const poseidonHasher = m.getParameter("poseidonHasher");

    const newImplementation = m.contract(contractsInfo.IDENTITY_TREE_STORE.name, []);

    // Update hasher for SmtLib
    const initializeData = m.encodeFunctionCall(newImplementation, "reinitialize", [
      poseidonHasher,
    ]);

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
