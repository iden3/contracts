import { ethers } from "hardhat";
import { expect } from "chai";

describe.only("poseidon", () => {
  it("check poseidon hash function with inputs [1, 2]", async () => {
    const Poseidon16 = await ethers.getContractFactory("NewPoseidon");
    const poseidon16 = await Poseidon16.deploy({
      gasLimit: 100000000,
    });

    const resGo = "9989051620750914585850546081941653841776809718687451684622678807385399211877";
    // const resSC = await poseidon16.hash([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const resSC = await poseidon16.hash([1]);
    expect(resSC).to.be.equal(resGo);
  });
});
