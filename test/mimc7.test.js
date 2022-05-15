const {expect} = require("chai");
const mimcGenContract = require("circomlib/src/mimc_gencontract.js");
const mimcjs = require("circomlib/src/mimc7.js");
const bigInt = require("big-integer");
const SEED = "mimc";
const {ethers} = require("hardhat");

describe("MiMc7", () => {
    let owner, address1, address2;
    let mimc7, mimcCircomJordi;

    before(async () => {
        [owner, address1, address2] = await ethers.getSigners();

        // Deploy new contract
        const C = await ethers.getContractFactoryFromArtifact({
            contractName: "",
            sourceName: "",
            abi: mimcGenContract.abi,
            bytecode: mimcGenContract.createCode(SEED, 91),
            deployedBytecode: "",
            linkReferences: {},
            deployedLinkReferences: {}
        }, owner)

        mimcCircomJordi = await C.deploy();
        await mimcCircomJordi.deployed();

        const Mimc7 = await ethers.getContractFactory("Mimc7");
        mimc7 = await Mimc7.deploy(mimcCircomJordi.address);
        await mimc7.deployed()
    });

    it("check mimc7 hash function", async () => {
        const e1 = bigInt(12);
        const e2 = bigInt(45);
        // Mimc7 smartcontract circomlib jordi
        const m1 = await mimcCircomJordi.MiMCpe7(e1.toString(), e2.toString());
        // Mimc7 javascript circomlib jordi
        const m2 = await mimcjs.hash(e1.toString(), e2.toString());
        // mimc7 iden3js [extracted using iden3js-mimc7 implementation]
        const iden3js = '19746142529723647765530752502670948774458299263315590587358840390982005703908';
        // mimc7 smartcontract
        const m3 = await mimc7.MiMCpe7(e1.toString(), e2.toString());

        expect(m1.toString()).to.be.equal(m2.toString());
        expect(m2.toString()).to.be.equal(m3.toString());
        expect(m3.toString()).to.be.equal(iden3js);
    });
});
