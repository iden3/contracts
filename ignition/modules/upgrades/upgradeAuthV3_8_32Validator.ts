import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_AUTH_V3_8_32.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeAuthV3_8_32ValidatorModule = buildModule(
  "UpgradeAuthV3_8_32ValidatorModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_AUTH_V3_8_32.name, proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_AUTH_V3_8_32.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      authV3_8_32Validator: proxy,
      newImplementation,
      groth16Verifier,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeAuthV3_8_32ValidatorModule;
