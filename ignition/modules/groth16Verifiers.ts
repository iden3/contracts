import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const Groth16VerifierStateTransitionModule = buildModule(
  "Groth16VerifierStateTransitionModule",
  (m) => {
    const g16VerifierStateTransition = m.contract("Groth16VerifierStateTransition");
    return { groth16VerifierStateTransition: g16VerifierStateTransition };
  },
);

export const Groth16VerifierStubModule = buildModule("VerifierStubModule", (m) => {
  const g16VerifierStub = m.contract("Groth16VerifierStub");
  return { groth16VerifierStub: g16VerifierStub };
});
