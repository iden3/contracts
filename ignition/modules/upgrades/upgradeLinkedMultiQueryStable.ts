import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.version
    .replaceAll(".", "_")
    .replaceAll("-", "_"),
);

const UpgradeLinkedMultiQueryStableValidatorModule = buildModule(
  "UpgradeLinkedMultiQueryStableValidatorModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      proxyAddress,
      {
        id: "Proxy",
      },
    );
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const groth16VerifierLinkedMultiQuery = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.name,
    );
    const groth16VerifierLinkedMultiQuery3 = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_3.name,
    );
    const groth16VerifierLinkedMultiQuery5 = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_5.name,
    );

    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      linkedMultiQueryValidator: proxy,
      newImplementation,
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeLinkedMultiQueryStableValidatorModule;
