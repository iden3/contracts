import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Poseidon1AtModule, SmtLibAtModule, StateAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(contractsInfo.STATE.version.replaceAll(".", "_").replaceAll("-", "_"));

const UpgradeStateNewImplementationModule = buildModule(
  "UpgradeStateNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(StateAtModule);

    const poseidon1 = m.useModule(Poseidon1AtModule).contract;
    const stateLib = m.contract("StateLib");
    const smtLib = m.useModule(SmtLibAtModule).contract;
    const domainName = "StateInfo";
    const signatureVersion = "1";
    const oracleSigningAddress = m.getParameter("oracleSigningAddress");

    const crossChainProofValidator = m.contract(contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name, [
      domainName,
      signatureVersion,
      oracleSigningAddress,
    ]);

    const newImplementation = m.contract(contractsInfo.STATE.name, [], {
      libraries: {
        StateLib: stateLib,
        SmtLib: smtLib,
        PoseidonUnit1L: poseidon1,
      },
    });

    // In some old ProxyAdmin versions, the upgradeAndCall function does not accept
    // an empty data parameter for initializeData like "0x".
    // So we encode a valid function call that does not change the state of the contract.
    const initializeData = m.encodeFunctionCall(newImplementation, "VERSION");

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
