import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../helpers/constants";

export const Create2AddressAnchorAtModule = buildModule("Create2AddressAnchorAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.CREATE2_ADDRESS_ANCHOR.name, contractAddress);

  return { contract };
});

export const Poseidon1AtModule = buildModule("Poseidon1AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_1.name, contractAddress);
  return { contract };
});

export const Poseidon2AtModule = buildModule("Poseidon2AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_2.name, contractAddress);
  return { contract };
});

export const Poseidon3AtModule = buildModule("Poseidon3AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_3.name, contractAddress);
  return { contract };
});

export const Poseidon4AtModule = buildModule("Poseidon4AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_4.name, contractAddress);
  return { contract };
});

export const SmtLibAtModule = buildModule("SmtLibAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.SMT_LIB.name, contractAddress);
  return { contract };
});

export const VerifierLibAtModule = buildModule("VerifierLibAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt("VerifierLib", contractAddress);
  return { contract };
});

export const Groth16VerifierStateTransitionAtModule = buildModule(
  "Groth16VerifierStateTransitionAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(
      contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.name,
      contractAddress,
    );
    return { contract };
  },
);

export const StateLibAtModule = buildModule("StateLibAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.STATE_LIB.name, contractAddress);
  return { contract };
});

export const CrossChainProofValidatorAtModule = buildModule(
  "CrossChainProofValidatorAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name, contractAddress);
    return { contract };
  },
);

export const StateNewImplementationAtModule = buildModule("StateNewImplementationAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.STATE.name, contractAddress);
  return { contract };
});

export const StateAtModule = buildModule("StateAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.STATE.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});

export const UniversalVerifierNewImplementationAtModule = buildModule(
  "UniversalVerifierNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, contractAddress);
    return { contract };
  },
);

export const UniversalVerifierAtModule = buildModule("UniversalVerifierAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});

export const IdentityTreeStoreNewImplementationAtModule = buildModule(
  "IdentityTreeStoreNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.IDENTITY_TREE_STORE.name, contractAddress);
    return { contract };
  },
);

export const IdentityTreeStoreAtModule = buildModule("IdentityTreeStoreAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.IDENTITY_TREE_STORE.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});

export const Groth16VerifierMTPWrapperAtModule = buildModule(
  "Groth16VerifierMTPWrapperAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.GROTH16_VERIFIER_MTP.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQueryMTPV2ValidatorNewImplementationAtModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_MTP.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQueryMTPV2ValidatorAtModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorAtModule",
  (m) => {
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_MTP.name, proxyAddress);
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxy, proxyAdmin };
  },
);

export const Groth16VerifierSigWrapperAtModule = buildModule(
  "Groth16VerifierSigWrapperAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.GROTH16_VERIFIER_SIG.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQuerySigV2ValidatorNewImplementationAtModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_SIG.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQuerySigV2ValidatorAtModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorAtModule",
  (m) => {
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_SIG.name, proxyAddress);
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxy, proxyAdmin };
  },
);

export const Groth16VerifierV3WrapperAtModule = buildModule(
  "Groth16VerifierV3WrapperAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.GROTH16_VERIFIER_V3.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQueryV3ValidatorNewImplementationAtModule = buildModule(
  "CredentialAtomicQueryV3ValidatorNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_V3.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQueryV3ValidatorAtModule = buildModule(
  "CredentialAtomicQueryV3ValidatorAtModule",
  (m) => {
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_V3.name, proxyAddress);
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxy, proxyAdmin };
  },
);

export const Groth16VerifierLinkedMultiQuery10WrapperAtModule = buildModule(
  "Groth16VerifierLinkedMultiQuery10WrapperAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
      contractAddress,
    );
    return { contract };
  },
);

export const LinkedMultiQueryValidatorNewImplementationAtModule = buildModule(
  "LinkedMultiQueryValidatorNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name, contractAddress);
    return { contract };
  },
);

export const LinkedMultiQueryValidatorAtModule = buildModule(
  "LinkedMultiQueryValidatorAtModule",
  (m) => {
    const proxyAddress = m.getParameter("proxyAddress");
    const proxyAdminAddress = m.getParameter("proxyAdminAddress");
    const proxy = m.contractAt(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name, proxyAddress);
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxy, proxyAdmin };
  },
);

export const Groth16VerifierAuthV2WrapperAtModule = buildModule(
  "Groth16VerifierAuthV2WrapperAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.GROTH16_VERIFIER_AUTH_V2.name, contractAddress);
    return { contract };
  },
);

export const AuthV2ValidatorNewImplementationAtModule = buildModule(
  "AuthV2ValidatorNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_AUTH_V2.name, contractAddress);
    return { contract };
  },
);

export const AuthV2ValidatorAtModule = buildModule("AuthV2ValidatorAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.VALIDATOR_AUTH_V2.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});

export const EthIdentityValidatorNewImplementationAtModule = buildModule(
  "EthIdentityValidatorNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, contractAddress);
    return { contract };
  },
);

export const EthIdentityValidatorAtModule = buildModule("EthIdentityValidatorAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});

export const MCPaymentNewImplementationAtModule = buildModule(
  "MCPaymentNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.MC_PAYMENT.name, contractAddress);
    return { contract };
  },
);

export const MCPaymentAtModule = buildModule("MCPaymentAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.MC_PAYMENT.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});

export const VCPaymentNewImplementationAtModule = buildModule(
  "VCPaymentNewImplementationAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VC_PAYMENT.name, contractAddress);
    return { contract };
  },
);

export const VCPaymentAtModule = buildModule("VCPaymentAtModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.VC_PAYMENT.name, proxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  return { proxy, proxyAdmin };
});
