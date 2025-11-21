import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.MC_PAYMENT.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeMCPaymentModule = buildModule("UpgradeMCPaymentModule".concat(version), (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.MC_PAYMENT.name, proxyAddress, {
    id: "Proxy",
  });
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const newImplementation = m.contract(contractsInfo.MC_PAYMENT.name);

  // As we are working with same proxy the storage is already initialized
  const initializeData = "0x";

  m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
    from: proxyAdminOwner,
  });

  return {
    mcPayment: proxy,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default UpgradeMCPaymentModule;
