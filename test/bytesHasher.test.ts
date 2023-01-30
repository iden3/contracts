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
      input: "Hello World!",
      expected: BigNumber.from("0x1cfcebd23f812fbaa6e5954aae9f35e33ce877d46e236a109ba9e677bb60d488"),
    },
    {
      input: "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      expected: BigNumber.from("0x0dec8a8aed35d0ea5cfb6dfb7b6701f55c1b687f54e3da221364fc575814d700"),
    },
    {
      name: "more than 295 > 31*6 = 186 bytes, which will be more than sponge hash frame size",
      input: "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      expected: BigNumber.from("0x0c51d73099a92d2124f3cc78ca5d94e976f9adffb8953e1eb94432fe7dfcf9df"),
    },
    {
      name: "105 bytes (4 inputs, the last is not full)",
      input: "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827",
      expected: BigNumber.from("0x150a92bfb0413865708a407e01273f771d10a02b5c4778dfecefdd0412afaa69"),
    },
    {
      name: "155 bytes (5 inputs, the last is full)",
      input: "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4",
      expected: BigNumber.from("0x2b8b6a5e4923b1b0b951cc20671cba8d1f00f722dcc722fe0447dee6201da072")
    },
    {
      name: "185 bytes (6 inputs, the last is not full)",
      input: "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:",
      expected: BigNumber.from("0x012ec488428ddc60e26757a69eb2a8e13bd758eeb6daec8f0bb950724b4f81b9")
    },
    {
      name: "186 bytes (6 inputs, the last is full)",
      input: "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:e",
      expected: BigNumber.from("0x176a0e4f39e389d973435142559707c33b3485eb9b6d3f0d723c53e4f6da562a"),
    },
  ];

  before(async () => {
    [signer] = await ethers.getSigners();
    const abi = poseidonGenContract.generateABI(frameSize);
    const code = poseidonGenContract.createCode(frameSize);
    const Poseidon = new ethers.ContractFactory(abi, code, signer);
    poseidon = await Poseidon.deploy();
    await poseidon.deployed();

    const BytesHasher = await ethers.getContractFactory("BytesHasher");
    bytesHasher = await BytesHasher.deploy(poseidon.address);
    await bytesHasher.deployed();
  });

  testCases.forEach((testCase) => {
    it(`should hash ${testCase.name ?? testCase.input}`, async () => {
      let result;
      switch (typeof testCase.input) {
        case "object":
          result = await bytesHasher.hashBytes(testCase.input);
          break;
        case "string":
          result = await bytesHasher.hashString(testCase.input);
          break;
        default:
          throw Error("Invalid input type");
      }

      expect(result).to.equal(testCase.expected);
    });
  });

  it("hash DID", async () => {
    // This hashes the string "did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    // but not the string "did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" (note the capitalization)
    const result = await bytesHasher.hashDID();
    expect(result).to.equal(BigNumber.from("0x0dec8a8aed35d0ea5cfb6dfb7b6701f55c1b687f54e3da221364fc575814d700"));
  });
});
