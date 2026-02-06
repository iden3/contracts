import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { SmtLibModule } from "./libraries";
import { AuthV2ValidatorImplementationModule } from "./authV2Validator";
import StateModule from "./state";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { LinkedMultiQueryValidatorImplementationModule } from "./linkedMultiQueryValidator";

export const Groth16VerifierStubModule = buildModule("Groth16VerifierStubModule", (m) => {
  const groth16VerifierStub = m.contract("Groth16VerifierStub");
  return { groth16VerifierStub };
});

export const Groth16VerifierValidatorStubModule = buildModule(
  "Groth16VerifierValidatorStubModule",
  (m) => {
    const groth16VerifierValidatorStub = m.contract("Groth16VerifierValidatorStub");
    return { groth16VerifierValidatorStub };
  },
);

export const GenesisUtilsWrapperModule = buildModule("GenesisUtilsWrapperModule", (m) => {
  const genesisUtilsWrapper = m.contract("GenesisUtilsWrapper");
  return { genesisUtilsWrapper };
});

export const PrimitiveTypeUtilsWrapperModule = buildModule(
  "PrimitiveTypeUtilsWrapperModule",
  (m) => {
    const primitiveTypeUtilsWrapper = m.contract("PrimitiveTypeUtilsWrapper");
    return { primitiveTypeUtilsWrapper };
  },
);

export const ClaimBuilderWrapperModule = buildModule("ClaimBuilderWrapperModule", (m) => {
  const claimBuilder = m.contract("ClaimBuilder");

  const claimBuilderWrapper = m.contract("ClaimBuilderWrapper", [], {
    libraries: {
      ClaimBuilder: claimBuilder,
    },
  });
  return { claimBuilderWrapper };
});

export const RequestValidatorStubModule = buildModule("RequestValidatorStubModule", (m) => {
  const requestValidatorStub = m.contract("RequestValidatorStub");
  return { requestValidatorStub };
});

export const AuthValidatorStubModule = buildModule("AuthValidatorStubModule", (m) => {
  const authValidatorStub = m.contract("AuthValidatorStub");
  return { authValidatorStub };
});

export const SmtLibTestWrapperModule = buildModule("SmtLibTestWrapperModule", (m) => {
  const smtLib = m.useModule(SmtLibModule).smtLib;

  const maxDepth = m.getParameter("maxDepth");
  if (!maxDepth) {
    throw new Error(`Failed to get maxDepth`);
  }

  const smtLibTestWrapper = m.contract("SmtLibTestWrapper", [maxDepth], {
    libraries: {
      SmtLib: smtLib,
    },
  });
  return { smtLibTestWrapper };
});

export const BinarySearchTestWrapperModule = buildModule("BinarySearchTestWrapperModule", (m) => {
  const smtLib = m.useModule(SmtLibModule).smtLib;

  const BSWrapper = m.contract("BinarySearchTestWrapper", [], {
    libraries: {
      SmtLib: smtLib,
    },
  });
  return { BSWrapper };
});

export const StateLibTestWrapperModule = buildModule("StateLibTestWrapperModule", (m) => {
  const stateLib = m.contract("StateLib");

  const stateLibTestWrapper = m.contract("StateLibTestWrapper", [], {
    libraries: {
      StateLib: stateLib,
    },
  });
  return { stateLibTestWrapper };
});

const AuthV2ValidatorProxyWithGroth16VerifierStubModule = buildModule(
  "AuthV2ValidatorProxyWithGroth16VerifierStubModule",
  (m) => {
    const { implementation } = m.useModule(AuthV2ValidatorImplementationModule);
    const { groth16VerifierValidatorStub } = m.useModule(Groth16VerifierValidatorStubModule);
    const state = m.useModule(StateModule).state;

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      groth16VerifierValidatorStub,
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

    return { proxy, state, implementation };
  },
);

export const AuthV2ValidatorWithGroth16VerifierStubModule = buildModule(
  "AuthV2ValidatorWithGroth16VerifierStubModule",
  (m) => {
    const { proxy, state, implementation } = m.useModule(
      AuthV2ValidatorProxyWithGroth16VerifierStubModule,
    );
    const authV2Validator = m.contractAt(contractsInfo.VALIDATOR_AUTH_V2.name, proxy);
    return { authV2Validator, state, implementation };
  },
);

const LinkedMultiQueryValidatorProxyWithGroth16VerifierStubModule = buildModule(
  "LinkedMultiQueryValidatorProxyWithGroth16VerifierStubModule",
  (m) => {
    const { implementation } = m.useModule(LinkedMultiQueryValidatorImplementationModule);
    const { groth16VerifierValidatorStub } = m.useModule(Groth16VerifierValidatorStubModule);

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      groth16VerifierValidatorStub,
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

    return { proxy, groth16VerifierValidatorStub };
  },
);

export const LinkedMultiQueryValidatorWithGroth16VerifierStubModule = buildModule(
  "LinkedMultiQueryValidatorWithGroth16VerifierStubModule",
  (m) => {
    const { proxy, groth16VerifierValidatorStub } = m.useModule(
      LinkedMultiQueryValidatorProxyWithGroth16VerifierStubModule,
    );
    const linkedMultiQueryValidator = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
      proxy,
    );
    return { linkedMultiQueryValidator, groth16VerifierValidatorStub };
  },
);

const VerifierLibModule = buildModule("VerifierLibModule", (m) => {
  const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);
  return { verifierLib };
});

const EmbeddedVerifierWrapperImplementationModule = buildModule(
  "EmbeddedVerifierWrapperImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

    const implementation = m.contract("EmbeddedVerifierWrapper", [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    return { implementation, verifierLib };
  },
);

const EmbeddedVerifierWrapperProxyModule = buildModule(
  "EmbeddedVerifierWrapperProxyModule",
  (m) => {
    const { implementation, verifierLib } = m.useModule(
      EmbeddedVerifierWrapperImplementationModule,
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
      contractOwner,
      state,
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

export const EmbeddedVerifierWrapperModule = buildModule("EmbeddedVerifierWrapperModule", (m) => {
  const {
    proxy,
    implementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  } = m.useModule(EmbeddedVerifierWrapperProxyModule);
  const embeddedVerifierWrapper = m.contractAt("EmbeddedVerifierWrapper", proxy);
  return {
    embeddedVerifierWrapper: embeddedVerifierWrapper,
    embeddedVerifierWrapperImplementation: implementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  };
});

const RequestDisableableTestWrapperImplementationModule = buildModule(
  "RequestDisableableTestWrapperImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

    const implementation = m.contract("RequestDisableableTestWrapper", [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    return { implementation, verifierLib };
  },
);

const RequestDisableableTestWrapperProxyModule = buildModule(
  "RequestDisableableTestWrapperProxyModule",
  (m) => {
    const { implementation, verifierLib } = m.useModule(
      RequestDisableableTestWrapperImplementationModule,
    );
    const {
      state,
      implementation: stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    } = m.useModule(StateModule);

    const proxyAdminOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [state]);

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

export const RequestDisableableTestWrapperModule = buildModule(
  "RequestDisableableTestWrapperModule",
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
    } = m.useModule(RequestDisableableTestWrapperProxyModule);
    const requestDisableableTestWrapper = m.contractAt("RequestDisableableTestWrapper", proxy);
    return {
      requestDisableableTestWrapper: requestDisableableTestWrapper,
      requestDisableableTestWrapperImplementation: implementation,
      verifierLib,
      state,
      stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    };
  },
);

const RequestOwnershipTestWrapperImplementationModule = buildModule(
  "RequestOwnershipTestWrapperImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

    const implementation = m.contract("RequestOwnershipTestWrapper", [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    return { implementation, verifierLib };
  },
);

const RequestOwnershipTestWrapperProxyModule = buildModule(
  "RequestOwnershipTestWrapperProxyModule",
  (m) => {
    const { implementation, verifierLib } = m.useModule(
      RequestOwnershipTestWrapperImplementationModule,
    );
    const {
      state,
      implementation: stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    } = m.useModule(StateModule);

    const proxyAdminOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [state]);

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

export const RequestOwnershipTestWrapperModule = buildModule(
  "RequestOwnershipTestWrapperModule",
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
    } = m.useModule(RequestOwnershipTestWrapperProxyModule);
    const requestOwnershipTestWrapper = m.contractAt("RequestOwnershipTestWrapper", proxy);
    return {
      requestOwnershipTestWrapper: requestOwnershipTestWrapper,
      requestOwnershipTestWrapperImplementation: implementation,
      verifierLib,
      state,
      stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    };
  },
);

const ValidatorWhitelistTestWrapperImplementationModule = buildModule(
  "ValidatorWhitelistTestWrapperImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

    const implementation = m.contract("ValidatorWhitelistTestWrapper", [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    return { implementation, verifierLib };
  },
);

const ValidatorWhitelistTestWrapperProxyModule = buildModule(
  "ValidatorWhitelistTestWrapperProxyModule",
  (m) => {
    const { implementation, verifierLib } = m.useModule(
      ValidatorWhitelistTestWrapperImplementationModule,
    );
    const {
      state,
      implementation: stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    } = m.useModule(StateModule);

    const proxyAdminOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [state]);

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

export const ValidatorWhitelistTestWrapperModule = buildModule(
  "ValidatorWhitelistTestWrapperModule",
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
    } = m.useModule(ValidatorWhitelistTestWrapperProxyModule);
    const validatorWhitelistTestWrapper = m.contractAt("ValidatorWhitelistTestWrapper", proxy);
    return {
      validatorWhitelistTestWrapper: validatorWhitelistTestWrapper,
      validatorWhitelistTestWrapperImplementation: implementation,
      verifierLib,
      state,
      stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    };
  },
);

const UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestImplementationModule = buildModule(
  "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

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

const UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestProxyModule = buildModule(
  "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestProxyModule",
  (m) => {
    const { implementation, verifierLib } = m.useModule(
      UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestImplementationModule,
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

export const UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestModule = buildModule(
  "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestModule",
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
    } = m.useModule(UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestProxyModule);
    const universalVerifierTestWrapper = m.contractAt(
      "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest",
      proxy,
    );
    return {
      universalVerifierTestWrapper: universalVerifierTestWrapper,
      universalVerifierTestWrapperImplementation: implementation,
      verifierLib,
      state,
      stateImplementation,
      crossChainProofValidator,
      stateLib,
      smtLib,
    };
  },
);
