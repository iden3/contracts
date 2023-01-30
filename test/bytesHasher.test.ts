import { expect } from "chai";
import { BigNumber } from "ethers";

const { ethers } = require("hardhat");

const { poseidonContract: poseidonGenContract } = require("circomlibjs");

describe("BytesHasher test", () => {
  const frameSize = 6;
  let signer;
  let bytesHasher;
  let poseidon;
  const testCases = [
    {
      input: 0xdead,
      expected: BigNumber.from("0x032281a2a1dbbc8b0eeba2b54b9e54ca067620ccfa6c3424302ca5b95bdb8cd8"),
    },
    {
      input: "Hello World!",
      expected: BigNumber.from("0x1cfcebd23f812fbaa6e5954aae9f35e33ce877d46e236a109ba9e677bb60d488"),
    },
    {
      input: "did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      expected: BigNumber.from("0x11ef280c466f1d4cb6653e738c61abe6441c3ea8edfc22b14084d9d05dbc6514"),
    },
    {
      input: "did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      expected: BigNumber.from("0x1afdb40a16bbbd9ec04bc9472e4d1d7dd2a8cdb378b3b7036baf6751001b7c0d"),
    },
  ];

  before(async () => {
    [signer] = await ethers.getSigners();
    const abi = poseidonGenContract.generateABI(frameSize);
    const code = poseidonGenContract.createCode(frameSize);
    const Poseidon = new ethers.ContractFactory(abi, code, signer);
    poseidon = await Poseidon.deploy();
    await poseidon.deployed();

    const DidHasher = await ethers.getContractFactory("BytesHasher");
    bytesHasher = await DidHasher.deploy(poseidon.address);
    await bytesHasher.deployed();
  });

  testCases.forEach((testCase) => {
    it(`should hash ${testCase.input}`, async () => {
      const result = await bytesHasher.hashString(testCase.input);
      console.log("Hash input: ", testCase.input);
      console.log("Result: ", result.toString());
      expect(result).to.equal(testCase.expected);
    });
  });

  it.skip("hash DID", async () => {
    // This hashes the string "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    // but not the string "did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" (note the capitalization)
    const result = await bytesHasher.hashDID();
    expect(result).to.equal(BigNumber.from("0x0dec8a8aed35d0ea5cfb6dfb7b6701f55c1b687f54e3da221364fc575814d700"));
  });

  it.skip("test1", async () => {
    const result = await bytesHasher.hash([1, 2, 3, 4, 5, 6]);
    console.log(result.toString(), result);
  });
});
