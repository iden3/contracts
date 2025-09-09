import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import StateModule from "./state";

const VerifierLibModule = buildModule("VerifierLibModule", (m) => {
  const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);
  return { verifierLib };
});

const UniversalVerifierImplementationModule = buildModule(
  "UniversalVerifierImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

    const implementation = m.contract("UniversalVerifier", [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    return { implementation, verifierLib };
  },
);

const UniversalVerifierProxyModule = buildModule("UniversalVerifierProxyModule", (m) => {
  const { implementation, verifierLib } = m.useModule(UniversalVerifierImplementationModule);
  const {
    state,
    implementation: stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  } = m.useModule(StateModule);

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [state, contractOwner]);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [implementation, proxyAdminOwner, initializeData],
  );

  return {
    proxy,
    implementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  };
});

const UniversalVerifierModule = buildModule("UniversalVerifierModule", (m) => {
  const {
    proxy,
    implementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  } = m.useModule(UniversalVerifierProxyModule);
  const universalVerifier = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxy);
  return {
    universalVerifier: universalVerifier,
    universalVerifierImplementation: implementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  };
});

export default UniversalVerifierModule;
