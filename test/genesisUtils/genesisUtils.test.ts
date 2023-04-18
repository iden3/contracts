import { deployGenesisUtilsWrapper } from "../utils/deploy-utils";
import { expect } from "chai";


describe("genesis state tests", function () {
  let guWrpr;

  before(async () => {
    guWrpr = await deployGenesisUtilsWrapper();
  });


  it("check provided id in the genesis state", async () => {
    const expectedResults = [
      { // (Iden3, NoChain, NoNetwork)
        id: '0x01000000000000000000000000000000000000000000000000000000131400',
        genIdState: '0x13',
        nonGenIdState: '0x12'
      },
      { // (PolygonId, NoChain, NoNetwork)
        id: '0x02000000000000000000000000000000000000000000000000000000131500',
        genIdState: '0x13',
        nonGenIdState: '0x14'
      },
      { // (PolygonId, Polygon, Main)
        id: '0x02110000000000000000000000000000000000000000000000000000132600',
        genIdState: '0x13',
        nonGenIdState: '0x25'
      },
      { // (PolygonId, Polygon, Mumbai)
        id: '0x02120000000000000000000000000000000000000000000000000000132700',
        genIdState: '0x13',
        nonGenIdState: '0x32'
      },
    ];

    for (let i = 0; i < expectedResults.length; i++) {
      const genResult = await guWrpr.isGenesisState(expectedResults[i].id, expectedResults[i].genIdState);
      await expect(genResult).to.be.equal(true);

      const nonGenResult = await guWrpr.isGenesisState(expectedResults[i].id, expectedResults[i].nonGenIdState);
      await expect(nonGenResult).to.be.equal(false);
    }

  });
 
});
