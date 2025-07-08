import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_V3.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeCredentialAtomicQueryV3ValidatorModule = buildModule(
  "UpgradeCredentialAtomicQueryV3ValidatorModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_V3.name, proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_V3.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_V3.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      credentialAtomicQueryV3Validator: proxy,
      newImplementation,
      groth16Verifier,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeCredentialAtomicQueryV3ValidatorModule;
