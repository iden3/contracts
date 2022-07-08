const {expect} = require("chai");
const {ethers} = require("hardhat");
const { poseidonContract } = require("circomlibjs");

describe("SMT", () => {
    let smt, poseidon2Elements, poseidon3Elements;

    before(async () => {
        const [
            owner,
            address1,
            address2,
        ] = await ethers.getSigners();

        const abi = poseidonContract.generateABI(2);
        const code = poseidonContract.createCode(2);
        const Poseidon2Elements = new ethers.ContractFactory(
            abi,
            code,
            owner
        );
        poseidon2Elements = await Poseidon2Elements.deploy();
        await poseidon2Elements.deployed();

        const abi3 = poseidonContract.generateABI(3);
        const code3 = poseidonContract.createCode(3);
        const Poseidon3Elements = new ethers.ContractFactory(
            abi3,
            code3,
            owner
        );
        poseidon3Elements = await Poseidon3Elements.deploy();
        await poseidon3Elements.deployed();

        const Smt = await ethers.getContractFactory("SMT");
        smt = await Smt.deploy(poseidon2Elements.address, poseidon3Elements.address);
        await smt.deployed();

    });

    it("add entry", async () => {
        const params1 = { k: 2**30-1,v: 100 };
        const params2 = { k: 2**31-1,v: 200 };
        // const params1 = { k: 7,v: 100 };
        // const params2 = { k: 15,v: 200 };
        await smt.add(params1.k, params1.v);
        await smt.add(params2.k, params2.v);
        // await smt.add(145, 735);
        // await smt.add(326, 15);

        // await smt.add(1, 100);
        // await smt.add(3, 100);

        // await smt.add(7, 100);
        // await smt.add(15, 100);
        // await smt.add(31, 100);
        // await smt.add(63, 100);
        // await smt.add(127, 100);
        // await smt.add(255, 100);
        // await smt.add(2**9-1, 100);
        // await smt.add(2**10-1, 100);
        // await smt.add(2**11-1, 100);
        // await smt.add(2**12-1, 100);
        // await smt.add(2**13-1, 100);
        // await smt.add(2**14-1, 100);
        // await smt.add(2**15-1, 100);
        // await smt.add(2**16-1, 100);
        // await smt.add(2**17-1, 100);
        // await smt.add(2**18-1, 100);
        // await smt.add(2**19-1, 100);
        // await smt.add(2**20-1, 100);
        // await smt.add(2**21-1, 100);
        // await smt.add(2**22-1, 100);
        // await smt.add(2**23-1, 100);
        // await smt.add(2**24-1, 100);
        // await smt.add(2**25-1, 100);
        // await smt.add(2**26-1, 100);
        // await smt.add(2**27-1, 100);
        // await smt.add(2**28-1, 100);
        // await smt.add(2**29-1, 100);
        // await smt.add(2**30-1, 100);
        // await smt.add(2**31-1, 100);

        // await smt.add(Math.floor(Math.random() * 2**32), params.v);

        const res1 = await smt.get(params1.k);
        console.log("res1: " + res1);
        expect(res1[1]).to.equal(params1.v);
        const res2 = await smt.get(params2.k);
        console.log("res2: " + res2);
        expect(res2[1]).to.equal(params2.v);
    });
});
