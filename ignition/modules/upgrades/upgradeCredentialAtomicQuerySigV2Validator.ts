import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { CredentialAtomicQuerySigV2ValidatorAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_SIG.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeCredentialAtomicQuerySigV2ValidatorNewImplementationModule = buildModule(
  "UpgradeCredentialAtomicQuerySigV2ValidatorNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQuerySigV2ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;

    const groth16Verifier = m.contract(contractsInfo.GROTH16_VERIFIER_SIG.name);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_SIG.name);

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

const UpgradeCredentialAtomicQuerySigV2ValidatorModule = buildModule(
  "UpgradeCredentialAtomicQuerySigV2ValidatorModule".concat(version),
  (m) => {
    const { newImplementation, groth16Verifier, state, proxyAdmin, proxy } = m.useModule(
      UpgradeCredentialAtomicQuerySigV2ValidatorNewImplementationModule,
    );

    const credentialAtomicQuerySigV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_SIG.name,
      proxy,
    );

    return {
      credentialAtomicQuerySigV2Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeCredentialAtomicQuerySigV2ValidatorModule;
