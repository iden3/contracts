import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { CredentialAtomicQueryMTPV2ValidatorAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_MTP.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeCredentialAtomicQueryMTPV2ValidatorNewImplementationModule = buildModule(
  "UpgradeCredentialAtomicQueryMTPV2ValidatorNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryMTPV2ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_MTP.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_MTP.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

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

const UpgradeCredentialAtomicQueryMTPV2ValidatorModule = buildModule(
  "UpgradeCredentialAtomicQueryMTPV2ValidatorModule".concat(version),
  (m) => {
    const { newImplementation, groth16Verifier, state, proxyAdmin, proxy } = m.useModule(
      UpgradeCredentialAtomicQueryMTPV2ValidatorNewImplementationModule,
    );

    const credentialAtomicQueryMTPV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_MTP.name,
      proxy,
    );

    return {
      credentialAtomicQueryMTPV2Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeCredentialAtomicQueryMTPV2ValidatorModule;
