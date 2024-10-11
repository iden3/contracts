import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../helpers/constants";

export const Groth16VerifierMTPWrapperModule = buildModule(
  "Groth16VerifierMTPWrapperModule",
  (m) => {
    const g16VerifierMTPWrapper = m.contract(contractsInfo.GROTH16_VERIFIER_MTP.name);
    return { wrapper: g16VerifierMTPWrapper };
  },
);

export const Groth16VerifierSigWrapperModule = buildModule(
  "Groth16VerifierSigWrapperModule",
  (m) => {
    const g16verifierSigWrapper = m.contract(contractsInfo.GROTH16_VERIFIER_SIG.name);
    return { wrapper: g16verifierSigWrapper };
  },
);

export const Groth16VerifierV3WrapperModule = buildModule("Groth16VerifierV3WrapperModule", (m) => {
  const g16VerifierV3Wrapper = m.contract(contractsInfo.GROTH16_VERIFIER_V3.name);
  return { wrapper: g16VerifierV3Wrapper };
});

export const Groth16VerifierStateTransitionModule = buildModule(
  "Groth16VerifierStateTransitionModule",
  (m) => {
    const g16VerifierStateTransition = m.contract(
      contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.name,
    );
    return { verifier: g16VerifierStateTransition };
  },
);
