import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import StateModule from "./state";

const UniversalVerifier_ManyResponsesPerUserAndRequestImplementationModule = buildModule(
  "UniversalVerifier_ManyResponsesPerUserAndRequestImplementationModule",
  (m) => {
    const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);

    const implementation = m.contract(
      "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest",
      [],
      {
        libraries: {
          VerifierLib: verifierLib,
        },
      },
    );

    return { implementation, verifierLib };
  },
);

const UniversalVerifier_ManyResponsesPerUserAndRequestProxyModule = buildModule(
  "UniversalVerifier_ManyResponsesPerUserAndRequestProxyModule",
  (m) => {
    const { implementation, verifierLib } = m.useModule(
      UniversalVerifier_ManyResponsesPerUserAndRequestImplementationModule,
    );
    const {
      state,
      implementation: stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    } = m.useModule(StateModule);

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      contractOwner,
    ]);

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
  },
);

const UniversalVerifier_ManyResponsesPerUserAndRequestModule = buildModule(
  "UniversalVerifier_ManyResponsesPerUserAndRequestModule",
  (m) => {
    const {
      proxy,
      implementation,
      verifierLib,
      state,
      stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    } = m.useModule(UniversalVerifier_ManyResponsesPerUserAndRequestProxyModule);
    const universalVerifier = m.contractAt(
      "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest",
      proxy,
    );
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
  },
);

export default UniversalVerifier_ManyResponsesPerUserAndRequestModule;
