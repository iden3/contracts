import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Poseidon3AtModule, Poseidon4AtModule, SmtLibAtModule, StateAtModule } from "./contractsAt";

const IdentityLibModule = buildModule("IdentityLibModule", (m) => {
  const poseidon3 = m.useModule(Poseidon3AtModule).contract;
  const poseidon4 = m.useModule(Poseidon4AtModule).contract;
  const smtLib = m.useModule(SmtLibAtModule).contract;

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
  const state = m.useModule(StateAtModule).proxy;
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

  return { proxyAdmin, proxy };
});

const IdentityExampleModule = buildModule("IdentityExampleModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(IdentityExampleProxyModule);

  const identityExample = m.contractAt("IdentityExample", proxy);

  return { identityExample, proxy, proxyAdmin };
});

export default IdentityExampleModule;
