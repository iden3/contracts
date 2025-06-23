import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { CredentialAtomicQueryV3ValidatorAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(contractsInfo.VALIDATOR_V3.version.replaceAll(".", "_"));

const UpgradeCredentialAtomicQueryV3ValidatorNewImplementationModule = buildModule(
  "UpgradeCredentialAtomicQueryV3ValidatorNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryV3ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_V3.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_V3.name);

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

const UpgradeCredentialAtomicQueryV3ValidatorModule = buildModule(
  "UpgradeCredentialAtomicQueryV3ValidatorModule".concat(version),
  (m) => {
    const { newImplementation, groth16Verifier, state, proxyAdmin, proxy } = m.useModule(
      UpgradeCredentialAtomicQueryV3ValidatorNewImplementationModule,
    );

    const credentialAtomicQueryV3Validator = m.contractAt(contractsInfo.VALIDATOR_V3.name, proxy);

    return {
      credentialAtomicQueryV3Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeCredentialAtomicQueryV3ValidatorModule;
