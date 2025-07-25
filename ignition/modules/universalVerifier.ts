import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import {
  Create2AddressAnchorAtModule,
  StateAtModule,
  UniversalVerifierAtModule,
  UniversalVerifierNewImplementationAtModule,
  VerifierLibAtModule,
} from "./contractsAt";

export const UniversalVerifierProxyFirstImplementationModule = buildModule(
  "UniversalVerifierProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getParameter("proxyAdminOwner");

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.
    const create2AddressAnchor = m.useModule(Create2AddressAnchorAtModule).contract;

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

export const VerifierLibModule = buildModule("VerifierLibModule", (m) => {
  const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);
  return { verifierLib };
});

export const UniversalVerifierFinalImplementationModule = buildModule(
  "UniversalVerifierFinalImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);
    const state = m.useModule(StateAtModule).proxy;

    const newImplementation = m.contract(contractsInfo.UNIVERSAL_VERIFIER.name, [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });
    return {
      verifierLib,
      state,
      newImplementation,
    };
  },
);

export const UniversalVerifierProxyModule = buildModule("UniversalVerifierProxyModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(UniversalVerifierProxyFirstImplementationModule);

  const { verifierLib, state, newImplementation } = m.useModule(
    UniversalVerifierFinalImplementationModule,
  );

  return {
    verifierLib,
    state,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

const UniversalVerifierProxyFinalImplementationModule = buildModule(
  "UniversalVerifierProxyFinalImplementationModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(UniversalVerifierAtModule);

    const { contract: verifierLib } = m.useModule(VerifierLibAtModule);
    const state = m.useModule(StateAtModule).proxy;
    const { contract: newImplementation } = m.useModule(UniversalVerifierNewImplementationAtModule);

    const proxyAdminOwner = m.getAccount(0);
    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      state,
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      verifierLib,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const UniversalVerifierModule = buildModule("UniversalVerifierModule", (m) => {
  const { verifierLib, state, newImplementation, proxyAdmin, proxy } = m.useModule(
    UniversalVerifierProxyFinalImplementationModule,
  );

  const universalVerifier = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxy);

  return {
    universalVerifier,
    verifierLib,
    state,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default UniversalVerifierModule;
