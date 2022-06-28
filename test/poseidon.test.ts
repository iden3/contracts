import { expect } from "chai";
import { ethers } from "hardhat";
import poseidonGenContract from "circomlib/src/poseidon_gencontract.js";
import poseidonjssrc from "circomlib/src/poseidon.js";
import bigInt from 'big-integer';
import { Artifact } from "hardhat/types";
const SEED = "poseidon";

describe("poseidon", () => {
  let owner, address1, address2;
  let poseidonCircomlib, poseidonSC, poseidonjs;

  before(async () => {
    [
      owner,
      address1,
      address2,
    ] = await ethers.getSigners();

    const PoseidonCircomlib = await ethers.getContractFactoryFromArtifact({
      contractName: "",
      sourceName: "",
      abi: poseidonGenContract.abi,
      bytecode: poseidonGenContract.createCode(6, 8, 57, SEED),
      deployedBytecode: "",
      linkReferences: {},
      deployedLinkReferences: {},
    } as Artifact, owner)

    poseidonCircomlib = await PoseidonCircomlib.deploy()
    await poseidonCircomlib.deployed()

    const Poseidon = await ethers.getContractFactory("Poseidon");
    poseidonSC = await Poseidon.deploy(poseidonCircomlib.address);
    poseidonSC.deployed()

    poseidonjs = poseidonjssrc.createHash(6, 8, 57);
  });

  it("check poseidon hash function with inputs [1, 2]", async () => {
    const e1 = bigInt(1);
    const e2 = bigInt(2);
    // Poseidon smartcontract circomlib
    const m1 = await poseidonCircomlib.poseidon([e1.toString(), e2.toString()]);
    // Poseidon javascript circomlib
    const m2 = await poseidonjs([e1, e2]);
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const goiden3 = '12242166908188651009877250812424843524687801523336557272219921456462821518061';
    // poseidon smartcontract
    const m3 = await poseidonSC.Hash([e1.toString(), e2.toString()]);
    
    expect(m1.toString()).to.be.equal(m2.toString());
    expect(m2.toString()).to.be.equal(m3.toString());
    expect(m3.toString()).to.be.equal(goiden3);
  });

  it("check poseidon hash function with inputs [12, 45]", async () => {
    const e1 = bigInt(12);
    const e2 = bigInt(45);
    // Poseidon smartcontract circomlib
    const m1 = await poseidonCircomlib.poseidon([e1.toString(), e2.toString()]);
    // Poseidon javascript circomlib
    const m2 = await poseidonjs([e1, e2]);
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const goiden3 = '8264042390138224340139792765748100791574617638410111480112729952476854478664';
    // poseidon smartcontract
    const m3 = await poseidonSC.Hash([e1.toString(), e2.toString()]);
    
    expect(m1.toString()).to.be.equal(m2.toString());
    expect(m2.toString()).to.be.equal(m3.toString());
    expect(m3.toString()).to.be.equal(goiden3);
  });
});
