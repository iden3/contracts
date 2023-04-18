import { deployGenesisUtilsWrapper } from "../utils/deploy-utils";
import { expect } from "chai";


describe.only("genesis state tests", function () {
  let guWrpr;

  before(async () => {
    guWrpr = await deployGenesisUtilsWrapper();
  });


  it("Provided id (Iden3, NoChain, NoNetwork) is genesis state", async () => {
    const id= BigInt('0x01000000000000000000000000000000000000000000000000000000131400');
    const genIdState = BigInt('0x13');
    const genResult = await guWrpr.isGenesisState(id, genIdState);
    await expect(genResult).to.be.equal(true);

    const nonGenIdState = BigInt('0x12');
    const nonGenResult = await guWrpr.isGenesisState(id, nonGenIdState);
    await expect(nonGenResult).to.be.equal(false);
  });

  it("Provided id (PolygonId, NoChain, NoNetwork) is genesis state", async () => {
    const id= BigInt('0x02000000000000000000000000000000000000000000000000000000131500');
    const genIdState = BigInt('0x13');
    const genResult = await guWrpr.isGenesisState(id, genIdState);
    await expect(genResult).to.be.equal(true);

    const nonGenIdState = BigInt('0x14');
    const nonGenResult = await guWrpr.isGenesisState(id, nonGenIdState);
    await expect(nonGenResult).to.be.equal(false);
  });

  it("Provided id (PolygonId, Polygon, Main) is genesis state", async () => {
    const id= BigInt('0x02110000000000000000000000000000000000000000000000000000132600');
    const genIdState = BigInt('0x13');
    const genResult = await guWrpr.isGenesisState(id, genIdState);
    await expect(genResult).to.be.equal(true);

    const nonGenIdState = BigInt('0x25');
    const nonGenResult = await guWrpr.isGenesisState(id, nonGenIdState);
    await expect(nonGenResult).to.be.equal(false);
  });

  it("Provided id (PolygonId, Polygon, Mumbai) is genesis state", async () => {
    const id= BigInt('0x02120000000000000000000000000000000000000000000000000000132700');
    const genIdState = BigInt('0x13');
    const genResult = await guWrpr.isGenesisState(id, genIdState);
    await expect(genResult).to.be.equal(true);

    const nonGenIdState = BigInt('0x32');
    const nonGenResult = await guWrpr.isGenesisState(id, nonGenIdState);
    await expect(nonGenResult).to.be.equal(false);
  });

 
});
