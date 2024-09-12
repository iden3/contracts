import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const VerifierMTPWrapperModule = buildModule("VerifierMTPWrapperModule", (m) => {
  const verifierMTPWrapper = m.contract("VerifierMTPWrapper");
  return { wrapper: verifierMTPWrapper };
});

export const VerifierSigWrapperModule = buildModule("VerifierSigWrapperModule", (m) => {
  const verifierSigWrapper = m.contract("VerifierSigWrapper");
  return { wrapper: verifierSigWrapper };
});

export const VerifierV3WrapperModule = buildModule("VerifierV3WrapperModule", (m) => {
  const verifierV3Wrapper = m.contract("VerifierV3Wrapper");
  return { wrapper: verifierV3Wrapper };
});
