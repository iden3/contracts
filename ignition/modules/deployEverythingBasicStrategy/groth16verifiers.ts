import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

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

export const Groth16VerifierLinkedMultiQuery10Module = buildModule(
  "Groth16VerifierLinkedMultiQuery10Module",
  (m) => {
    const groth16VerifierLinkedMultiQuery10 = m.contract(
      contractsInfo.GROTH16_VERIFIER_LINKED_MULTI_QUERY10.name,
    );
    return { groth16VerifierLinkedMultiQuery10 };
  },
);

export const Groth16VerifierAuthV2Module = buildModule("Groth16VerifierAuthV2Module", (m) => {
  const groth16VerifierAuthV2 = m.contract(contractsInfo.GROTH16_VERIFIER_AUTH_V2.name);
  return { groth16VerifierAuthV2 };
});
