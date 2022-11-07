import { expect } from "chai";
const { ethers } = require("hardhat");

const { poseidonContract: poseidonGenContract } = require("circomlibjs");

describe("poseidon", () => {
  let owner;
  let poseidon2Elements, poseidon3Elements, poseidon;

  before(async () => {
    [owner] = await ethers.getSigners();

    let abi = poseidonGenContract.generateABI(2);
    let code = poseidonGenContract.createCode(2);
    const Poseidon2Elements = new ethers.ContractFactory(abi, code, owner);
    poseidon2Elements = await Poseidon2Elements.deploy();
    await poseidon2Elements.deployed();

    abi = poseidonGenContract.generateABI(3);
    code = poseidonGenContract.createCode(3);
    const Poseidon3Elements = new ethers.ContractFactory(abi, code, owner);
    poseidon3Elements = await Poseidon3Elements.deploy();
    await poseidon3Elements.deployed();

    const Poseidon = await ethers.getContractFactory("Poseidon");
    poseidon = await Poseidon.deploy(
      poseidon2Elements.address,
      poseidon3Elements.address
    );
    poseidon.deployed();
  });

  it("check poseidon hash function with inputs [1, 2]", async () => {
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const resGo =
      "7853200120776062878684798364095072458815029376092732009249414926327459813530";
    // poseidon smartcontract
    const resSC = await poseidon.hash2([1, 2]);
    expect(resSC).to.be.equal(resGo);
  });

  it("check poseidon hash function with inputs [1, 2, 3]", async () => {
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const resGo =
      "6542985608222806190361240322586112750744169038454362455181422643027100751666";
    // poseidon smartcontract
    const resSC = await poseidon.hash3([1, 2, 3]);
    expect(resSC).to.be.equal(resGo);
  });
});
