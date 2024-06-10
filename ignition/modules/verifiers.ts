import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const VerifierStateTransitionModule = buildModule("VerifierStateTransitionModule", (m) => {
    const verifierStateTransition = m.contract("VerifierStateTransition");
    return { verifierStateTransition };
});

export const VerifierStubModule = buildModule("VerifierStubModule", (m) => {
    const verifierStub = m.contract("VerifierStub");
    return { verifierStub };
});
