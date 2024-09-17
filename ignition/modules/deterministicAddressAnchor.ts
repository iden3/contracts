import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const DeterministicAddressAnchorModule = buildModule(
  "DeterministicAddressAnchorModule",
  (m) => {
    const deterministicAddressAnchor = m.contract("DeterministicAddressAnchor");
    return { deterministicAddressAnchor };
  },
);
