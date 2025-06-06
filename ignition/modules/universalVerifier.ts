import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import Create2AddressAnchorModule from "./create2AddressAnchor";
import StateModule from "./state";

export const UniversalVerifierProxyFirstImplementationModule = buildModule(
  "UniversalVerifierProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.
    const create2AddressAnchor = m.useModule(Create2AddressAnchorModule).create2AddressAnchor;

    const proxy = m.contract(
      "TransparentUpgradeableProxy",
      {
        abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
        contractName: "TransparentUpgradeableProxy",
        bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
        sourceName: "",
        linkReferences: {},
      },
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.UNIVERSAL_VERIFIER.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const VerifierLibModule = buildModule("VerifierLibModule", (m) => {
  const verifierLib = m.contract("VerifierLib");
  return { verifierLib };
});

const UniversalVerifierProxyModule = buildModule("UniversalVerifierProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const { proxy, proxyAdmin } = m.useModule(UniversalVerifierProxyFirstImplementationModule);

  const { verifierLib } = m.useModule(VerifierLibModule);
  const { state } = m.useModule(StateModule);

  const newUniversalVerifierImpl = m.contract(contractsInfo.UNIVERSAL_VERIFIER.name, [], {
    libraries: {
      VerifierLib: verifierLib,
    },
  });

  const initializeData = m.encodeFunctionCall(newUniversalVerifierImpl, "initialize", [
    state,
    proxyAdminOwner,
  ]);

  m.call(proxyAdmin, "upgradeAndCall", [proxy, newUniversalVerifierImpl, initializeData], {
    from: proxyAdminOwner,
  });

  return {
    verifierLib,
    state,
    newUniversalVerifierImpl,
    proxyAdmin,
    proxy,
  };
});

const UniversalVerifierModule = buildModule("UniversalVerifierModule", (m) => {
  const { verifierLib, state, newUniversalVerifierImpl, proxyAdmin, proxy } = m.useModule(
    UniversalVerifierProxyModule,
  );

  const universalVerifier = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxy);

  return {
    universalVerifier,
    verifierLib,
    state,
    newUniversalVerifierImpl,
    proxyAdmin,
    proxy,
  };
});

export default UniversalVerifierModule;
