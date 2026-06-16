import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AlwaysRevertModule = buildModule("AlwaysRevertModule", (m) => {
  const alwaysRevert = m.contract("AlwaysRevert");

  return { alwaysRevert };
});

export default AlwaysRevertModule;
