import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_ETH_IDENTITY.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeEthIdentityValidatorModule = buildModule(
  "UpgradeEthIdentityValidatorModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const newImplementation = m.contract(contractsInfo.VALIDATOR_AUTH_V2.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      ethIdentityValidator: proxy,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeEthIdentityValidatorModule;
