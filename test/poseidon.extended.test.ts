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

  it("check poseidon hash function with different inputs", async () => {
    const testCases = [
      new Array(64).fill(0),
      new Array(63).fill(0).map((_, i) => i + 1),
      new Array(60).fill(0).map((_, i) => 60 - i),
      new Array(5).fill(0).map((_, i) => i + 1),
      [0],
      new Array(6).fill(0).map((_, i) => i + 1),
    ];

    const expected = [
      "7368935780301629035733097554153370898490964345621267223639562510928947240459",
      "5141441971348023348086244244216563379825719214260560525236342102655139861412",
      "1980406908386847376697137710198826655972108629440197428494707119108499632713",
      "2579592068985894564663884204285667087640059297900666937160965942401359072100",
      "14408838593220040598588012778523101864903887657864399481915450526643617223637",
      "11520133791077739462983963458665556954298550456396705311618752731525149020132",
    ];

    for (let index = 0; index < testCases.length; index++) {
      const testCase = testCases[index];
      const expectedHash = expected[index];
      const res = await poseidonExtended.poseidonFold(testCase);
      expect(res.toString()).to.equal(expectedHash);
    }
  });
});
