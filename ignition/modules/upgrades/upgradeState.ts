import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Poseidon1AtModule, SmtLibAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(contractsInfo.STATE.version.replaceAll(".", "_"));

const CrossChainProofValidatorModule = buildModule(
  "CrossChainProofValidatorModule".concat(version),
  (m) => {
    const domainName = "StateInfo";
    const signatureVersion = "1";
    const oracleSigningAddress = m.getParameter("oracleSigningAddress");

    const crossChainProofValidator = m.contract(contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name, [
      domainName,
      signatureVersion,
      oracleSigningAddress,
    ]);

    return { crossChainProofValidator };
  },
);

const UpgradeStateNewImplementationModule = buildModule(
  "UpgradeStateNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(StateAtModule);

    const poseidon1 = m.useModule(Poseidon1AtModule).contract;
    const stateLib = m.contract("StateLib");
    const smtLib = m.useModule(SmtLibAtModule).contract;
    const { crossChainProofValidator } = m.useModule(CrossChainProofValidatorModule);

    const newImplementation = m.contract(contractsInfo.STATE.name, [], {
      libraries: {
        StateLib: stateLib,
        SmtLib: smtLib,
        PoseidonUnit1L: poseidon1,
      },
    });

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      crossChainProofValidator,
      stateLib,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const UpgradeStateModule = buildModule("UpgradeStateModule".concat(version), (m) => {
  const { crossChainProofValidator, stateLib, newImplementation, proxyAdmin, proxy } = m.useModule(
    UpgradeStateNewImplementationModule,
  );

  const state = m.contractAt(contractsInfo.STATE.name, proxy);

  return {
    state,
    newImplementation,
    crossChainProofValidator,
    stateLib,
    proxyAdmin,
    proxy,
  };
});

export default UpgradeStateModule;
