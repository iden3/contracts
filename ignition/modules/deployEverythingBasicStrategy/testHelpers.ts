import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const Groth16VerifierStubModule = buildModule(
  "Groth16VerifierStubModule",
  (m) => {
    const groth16VerifierStub = m.contract("Groth16VerifierStub");
    return { groth16VerifierStub };
  },
);

export const Groth16VerifierValidatorStub = buildModule(
  "Groth16VerifierValidatorStub",
  (m) => {
    const groth16VerifierValidatorStub = m.contract("Groth16VerifierValidatorStub");
    return { groth16VerifierValidatorStub };
  },
);