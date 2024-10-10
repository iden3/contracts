import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { CONTRACT_NAMES } from "../../helpers/constants";

export const Groth16VerifierMTPWrapperModule = buildModule(
  "Groth16VerifierMTPWrapperModule",
  (m) => {
    const g16VerifierMTPWrapper = m.contract(CONTRACT_NAMES.GROTH16_VERIFIER_MTP);
    return { wrapper: g16VerifierMTPWrapper };
  },
);

export const Groth16VerifierSigWrapperModule = buildModule(
  "Groth16VerifierSigWrapperModule",
  (m) => {
    const g16verifierSigWrapper = m.contract(CONTRACT_NAMES.GROTH16_VERIFIER_SIG);
    return { wrapper: g16verifierSigWrapper };
  },
);

export const Groth16VerifierV3WrapperModule = buildModule("Groth16VerifierV3WrapperModule", (m) => {
  const g16VerifierV3Wrapper = m.contract(CONTRACT_NAMES.GROTH16_VERIFIER_V3);
  return { wrapper: g16VerifierV3Wrapper };
});

export const Groth16VerifierStateTransitionModule = buildModule(
  "Groth16VerifierStateTransitionModule",
  (m) => {
    const g16VerifierStateTransition = m.contract(CONTRACT_NAMES.GROTH16_VERIFIER_STATE_TRANSITION);
    return { verifier: g16VerifierStateTransition };
  },
);
