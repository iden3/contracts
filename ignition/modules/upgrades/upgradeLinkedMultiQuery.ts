import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { LinkedMultiQueryValidatorAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.version.replaceAll(".", "_"));

const UpgradeLinkedMultiQueryValidatorNewImplementationModule = buildModule(
  "UpgradeLinkedMultiQueryValidatorNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(LinkedMultiQueryValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name);

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

const UpgradeLinkedMultiQueryValidatorModule = buildModule(
  "UpgradeLinkedMultiQueryValidatorModule".concat(version),
  (m) => {
    const { newImplementation, groth16Verifier, state, proxyAdmin, proxy } = m.useModule(
      UpgradeLinkedMultiQueryValidatorNewImplementationModule,
    );

    const linkedMultiQueryValidator = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy,
    );

    return {
      linkedMultiQueryValidator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeLinkedMultiQueryValidatorModule;
