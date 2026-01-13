import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Poseidon3Module, Poseidon4Module, SmtLibModule } from "./libraries";
import StateModule from "./state";

const IdentityLibModule = buildModule("IdentityLibModule", (m) => {
  const poseidon3 = m.useModule(Poseidon3Module).poseidon;
  const poseidon4 = m.useModule(Poseidon4Module).poseidon;
  const smtLib = m.useModule(SmtLibModule).smtLib;

  const identityLib = m.contract("IdentityLib", [], {
    libraries: {
      SmtLib: smtLib,
      PoseidonUnit3L: poseidon3,
      PoseidonUnit4L: poseidon4,
    },
  });
  return { identityLib };
});

const ClaimBuilderModule = buildModule("ClaimBuilderModule", (m) => {
  const claimBuilder = m.contract("ClaimBuilder");
  return { claimBuilder };
});

const IdentityExampleProxyModule = buildModule("IdentityExampleProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const { claimBuilder } = m.useModule(ClaimBuilderModule);
  const { identityLib } = m.useModule(IdentityLibModule);
  const state = m.useModule(StateModule).state;
  const defaultIdType = m.getParameter("defaultIdType");

  const identityExample = m.contract("IdentityExample", [], {
    libraries: {
      ClaimBuilder: claimBuilder,
      IdentityLib: identityLib,
    },
  });

  const proxy = m.contract("TransparentUpgradeableProxy", [identityExample, proxyAdminOwner, "0x"]);

  const identityExampleProxy = m.contractAt("IdentityExample", proxy, {
    id: "identityExampleProxy",
  });

  m.call(identityExampleProxy, "initialize", [state, defaultIdType], {
    from: proxyAdminOwner,
  });

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy, state, identityLib };
});

const IdentityExampleModule = buildModule("IdentityExampleModule", (m) => {
  const { proxy, proxyAdmin, state, identityLib } = m.useModule(IdentityExampleProxyModule);
  const identityExample = m.contractAt("IdentityExample", proxy);

  return { identityExample, proxy, proxyAdmin, state, identityLib };
});

export default IdentityExampleModule;
