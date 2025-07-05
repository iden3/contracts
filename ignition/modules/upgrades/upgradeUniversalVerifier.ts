import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.UNIVERSAL_VERIFIER.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeUniversalVerifierModule = buildModule(
  "UpgradeUniversalVerifierModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);

    const newImplementation = m.contract(contractsInfo.UNIVERSAL_VERIFIER.name, [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      universalVerifier: proxy,
      newImplementation,
      verifierLib,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeUniversalVerifierModule;
