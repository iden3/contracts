import { expect } from "chai";
import { ethers } from "hardhat";

describe("Poseidon sanity", function () {
  it("Poseidon libraries should not return zero for normal inputs", async function () {
    const PoseidonUnit1LFactory = await ethers.getContractFactory("PoseidonUnit1L");
    const poseidon1 = await PoseidonUnit1LFactory.deploy();
    await poseidon1.waitForDeployment();

    const PoseidonUnit2LFactory = await ethers.getContractFactory("PoseidonUnit2L");
    const poseidon2 = await PoseidonUnit2LFactory.deploy();
    await poseidon2.waitForDeployment();

    const PoseidonUnit3LFactory = await ethers.getContractFactory("PoseidonUnit3L");
    const poseidon3 = await PoseidonUnit3LFactory.deploy();
    await poseidon3.waitForDeployment();

    const h1 = await poseidon1.poseidon([123n]);
    const h2 = await poseidon2.poseidon([123n, 456n]);
    const h3a = await poseidon3.poseidon([0n, 111n, 1n]);
    const h3b = await poseidon3.poseidon([0n, 222n, 1n]);

    expect(h1).to.not.equal(0n);
    expect(h2).to.not.equal(0n);
    expect(h3a).to.not.equal(0n);
    expect(h3b).to.not.equal(0n);
    expect(h3a).to.not.equal(h3b);
  });
});