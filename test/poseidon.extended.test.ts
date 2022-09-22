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
      "172461450423098299779558585913272526184491409754318143466636740798721781531"
    );
    res = await poseidonExtended.poseidonFold(
      new Array(64).fill(0).map((_, i) => i + 1)
    );
    expect(res).to.be.equal(
      "18173841470118503158619573020092343043385785229652304338844607185225534139846"
    );
    res = await poseidonExtended.poseidonFold(
      new Array(64).fill(0).map((_, i) => 64 - i)
    );
    expect(res).to.be.equal(
      "10381411498701876887882094520133801282308319455700664666280480650283799862086"
    );
  });
});
