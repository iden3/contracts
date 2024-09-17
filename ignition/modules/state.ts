import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StateProxyModule = buildModule("StateProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const stateLibAddress = m.getParameter("stateLibAddress");
  const smtLibAddress = m.getParameter("smtLibAddress");
  const poseidonUnit1LAddress = m.getParameter("poseidonUnit1LAddress");
  const stateCrossChainLibAddress = m.getParameter("stateCrossChainLibAddress");

  const stateLib = m.contractAt("StateLib", stateLibAddress);
  const smtLib = m.contractAt("SmtLib", smtLibAddress);
  const poseidonUnit1L = m.contractAt("PoseidonUnit1L", poseidonUnit1LAddress);
  const stateCrossChainLib = m.contractAt("StateCrossChainLib", stateCrossChainLibAddress);

  const state = m.contract("State", [], {
    libraries: {
      StateLib: stateLib,
      SmtLib: smtLib,
      PoseidonUnit1L: poseidonUnit1L,
      StateCrossChainLib: stateCrossChainLib,
    },
  });

  // const proxy = m.contract("TransparentUpgradeableProxy", [state, proxyAdminOwner, "0x"]);
  const proxy = m.contract("TransparentUpgradeableProxy", [
    // state,
    "0xd6EdDbf024188254C4382a705BA4aCf24639a014",
    proxyAdminOwner,
    // "0x80203136fae3111b810106baa500231d4fd08fc6",
    "0x",
  ]);
  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  // m.call(proxyAdmin, "upgradeAndCall", [proxy, state, "0x"]);
  // m.call(proxyAdmin, "transferOwnership", [proxyAdminOwner]);

  return { proxyAdmin, proxy };
});

export const StateModule = buildModule("StateModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(StateProxyModule);
  const state = m.contractAt("State", proxy);
  return { state, proxy, proxyAdmin };
});
