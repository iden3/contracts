import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { AuthV2ValidatorAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(contractsInfo.VALIDATOR_AUTH_V2.version.replaceAll(".", "_"));

const UpgradeAuthV2ValidatorNewImplementationModule = buildModule(
  "UpgradeAuthV2ValidatorNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(AuthV2ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_AUTH_V2.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_AUTH_V2.name);

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      state,
      groth16Verifier,
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      newImplementation,
      groth16Verifier,
      state,
      proxyAdmin,
      proxy,
    };
  },
);

const UpgradeAuthV2ValidatorModule = buildModule(
  "UpgradeAuthV2ValidatorModule".concat(version),
  (m) => {
    const { newImplementation, groth16Verifier, state, proxyAdmin, proxy } = m.useModule(
      UpgradeAuthV2ValidatorNewImplementationModule,
    );

    const authV2Validator = m.contractAt(contractsInfo.VALIDATOR_AUTH_V2.name, proxy);

    return {
      authV2Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeAuthV2ValidatorModule;
