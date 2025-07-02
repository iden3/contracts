import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { StateAtModule, UniversalVerifierAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.UNIVERSAL_VERIFIER.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeUniversalVerifierNewImplementationModule = buildModule(
  "UpgradeUniversalVerifierNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(UniversalVerifierAtModule);

    const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);
    const state = m.useModule(StateAtModule).proxy;

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
      newImplementation,
      verifierLib,
      state,
      proxyAdmin,
      proxy,
    };
  },
);

const UpgradeUniversalVerifierModule = buildModule(
  "UpgradeUniversalVerifierModule".concat(version),
  (m) => {
    const { verifierLib, state, newImplementation, proxyAdmin, proxy } = m.useModule(
      UpgradeUniversalVerifierNewImplementationModule,
    );

    const universalVerifier = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxy);

    return {
      universalVerifier,
      newImplementation,
      verifierLib,
      state,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeUniversalVerifierModule;
