import { ethers, upgrades } from "hardhat";
import { expect } from "chai";

// dummy proof
const d = [
  [0, 0],
  [
    [0, 0],
    [0, 0],
  ],
  [0, 0],
  [0, 0, 0, 0],
];

describe("Disable Proxy Contract test", async () => {
  it("Should disable and enable proxy contract", async () => {
    const verifierStubFactory = await ethers.getContractFactory("Groth16VerifierStub");
    const verifier = await upgrades.deployProxy(verifierStubFactory, { kind: "transparent" });
    await expect(verifier.verifyProof(d[0], d[1], d[2], d[3])).not.to.be.reverted;

    const alwaysRevertFactory = await ethers.getContractFactory("AlwaysRevert");
    await upgrades.upgradeProxy(await verifier.getAddress(), alwaysRevertFactory);
    await expect(verifier.verifyProof(d[0], d[1], d[2], d[3])).to.be.revertedWith(
      "The contract is disabled",
    );

    await upgrades.upgradeProxy(await verifier.getAddress(), verifierStubFactory);
    await expect(verifier.verifyProof(d[0], d[1], d[2], d[3])).not.to.be.reverted;
  });
});
