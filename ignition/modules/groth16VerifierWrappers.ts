import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const Groth16VerifierMTPWrapperModule = buildModule(
  "Groth16VerifierMTPWrapperModule",
  (m) => {
    const g16VerifierMTPWrapper = m.contract("Groth16VerifierMTPWrapper");
    return { wrapper: g16VerifierMTPWrapper };
  },
);

export const Groth16VerifierSigWrapperModule = buildModule(
  "Groth16VerifierSigWrapperModule",
  (m) => {
    const g16verifierSigWrapper = m.contract("Groth16VerifierSigWrapper");
    return { wrapper: g16verifierSigWrapper };
  },
);

export const Groth16VerifierV3WrapperModule = buildModule("Groth16VerifierV3WrapperModule", (m) => {
  const g16VerifierV3Wrapper = m.contract("Groth16VerifierV3Wrapper");
  return { wrapper: g16VerifierV3Wrapper };
});
