import { expect } from "chai";
import { deployPoseidonExt } from "./deploy-utils";
const { ethers } = require("hardhat");

describe("poseidon advanced", () => {
  let owner;
  let poseidonExtended;

  before(async () => {
    [owner] = await ethers.getSigners();
    poseidonExtended = await deployPoseidonExt(owner);
  });

  it("check poseidon hash function with inputs 64 inputs", async () => {
    let res = await poseidonExtended.poseidonFold(new Array(64).fill(0));
    expect(res).to.be.equal(
      "727338310353795144219993768420910033473938536894650379536715977254833201346"
    );
    res = await poseidonExtended.poseidonFold(
      new Array(64).fill(0).map((_, i) => i + 1)
    );
    expect(res).to.be.equal(
      "9206504708748250872960725447878206077072019695495427485684343849164309826975"
    );
    res = await poseidonExtended.poseidonFold(
      new Array(64).fill(0).map((_, i) => 64 - i)
    );
    expect(res).to.be.equal(
      "11790321463525137746903439564431765868870258693422117265865753765715743495357"
    );
  });
});
