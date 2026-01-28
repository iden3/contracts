import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../helpers/constants";

export const Groth16VerifierStateTransitionModule = buildModule(
  "Groth16VerifierStateTransitionModule",
  (m) => {
    const groth16VerifierStateTransition = m.contract(
      contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.name,
    );
    return { groth16VerifierStateTransition };
  },
);

export const Groth16VerifierMTPModule = buildModule("Groth16VerifierMTPModule", (m) => {
  const groth16VerifierMTP = m.contract(contractsInfo.GROTH16_VERIFIER_MTP.name);
  return { groth16VerifierMTP };
});

export const Groth16VerifierSigModule = buildModule("Groth16VerifierSigModule", (m) => {
  const groth16VerifierSig = m.contract(contractsInfo.GROTH16_VERIFIER_SIG.name);
  return { groth16VerifierSig };
});

export const Groth16VerifierV3Module = buildModule("Groth16VerifierV3Module", (m) => {
  const groth16VerifierV3 = m.contract(contractsInfo.GROTH16_VERIFIER_V3.name);
  return { groth16VerifierV3 };
});

export const Groth16VerifierV3StableModule = buildModule("Groth16VerifierV3StableModule", (m) => {
  const groth16VerifierV3Stable = m.contract(contractsInfo.GROTH16_VERIFIER_V3_STABLE.name);
  return { groth16VerifierV3Stable };
});

export const Groth16VerifierV3Stable_16_16_64_16_32Module = buildModule(
  "Groth16VerifierV3Stable_16_16_64_16_32Module",
  (m) => {
    const groth16VerifierV3Stable_16_16_64_16_32 = m.contract(
      contractsInfo.GROTH16_VERIFIER_V3_STABLE_16_16_64_16_32.name,
    );
    return { groth16VerifierV3Stable_16_16_64_16_32 };
  },
);

export const Groth16VerifierLinkedMultiQuery10Module = buildModule(
  "Groth16VerifierLinkedMultiQuery10Module",
  (m) => {
    const groth16VerifierLinkedMultiQuery10 = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_10.name,
    );
    return { groth16VerifierLinkedMultiQuery10 };
  },
);

export const Groth16VerifierLinkedMultiQueryModule = buildModule(
  "Groth16VerifierLinkedMultiQueryModule",
  (m) => {
    const groth16VerifierLinkedMultiQuery = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY.name,
    );
    return { groth16VerifierLinkedMultiQuery };
  },
);

export const Groth16VerifierLinkedMultiQuery5Module = buildModule(
  "Groth16VerifierLinkedMultiQuery5Module",
  (m) => {
    const groth16VerifierLinkedMultiQuery5 = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_5.name,
    );
    return { groth16VerifierLinkedMultiQuery5 };
  },
);

export const Groth16VerifierLinkedMultiQuery3Module = buildModule(
  "Groth16VerifierLinkedMultiQuery3Module",
  (m) => {
    const groth16VerifierLinkedMultiQuery3 = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY_3.name,
    );
    return { groth16VerifierLinkedMultiQuery3 };
  },
);

export const Groth16VerifierAuthV2Module = buildModule("Groth16VerifierAuthV2Module", (m) => {
  const groth16VerifierAuthV2 = m.contract(contractsInfo.GROTH16_VERIFIER_AUTH_V2.name);
  return { groth16VerifierAuthV2 };
});

export const Groth16VerifierAuthV3Module = buildModule("Groth16VerifierAuthV3Module", (m) => {
  const groth16VerifierAuthV3 = m.contract(contractsInfo.GROTH16_VERIFIER_AUTH_V3.name);
  return { groth16VerifierAuthV3 };
});

export const Groth16VerifierAuthV3_8_32Module = buildModule(
  "Groth16VerifierAuthV3_8_32Module",
  (m) => {
    const groth16VerifierAuthV3_8_32 = m.contract(contractsInfo.GROTH16_VERIFIER_AUTH_V3_8_32.name);
    return { groth16VerifierAuthV3_8_32 };
  },
);
