import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeLinkedMultiQueryValidatorModule = buildModule(
  "UpgradeLinkedMultiQueryValidatorModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name, proxyAddress, {
      id: "Proxy",
    });
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      linkedMultiQueryValidator: proxy,
      newImplementation,
      groth16Verifier,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeLinkedMultiQueryValidatorModule;
