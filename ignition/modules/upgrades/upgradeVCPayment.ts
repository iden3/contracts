import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VC_PAYMENT.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeVCPaymentModule = buildModule("UpgradeVCPaymentModule".concat(version), (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.VC_PAYMENT.name, proxyAddress, {
    id: "Proxy",
  });
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const newImplementation = m.contract(contractsInfo.VC_PAYMENT.name);

  // As we are working with same proxy the storage is already initialized
  const initializeData = "0x";

  m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
    from: proxyAdminOwner,
  });

  return {
    vcPayment: proxy,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default UpgradeVCPaymentModule;
