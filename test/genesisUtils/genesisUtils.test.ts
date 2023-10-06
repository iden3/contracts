import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

let guWrpr;
const testVectors = [
  {
    id: '0x00010000000000000000000000000000000000000000000000000000010000',
    idType: '0x0000',
    // only first 27 bytes are used, so last 5 bytes do not influence the result
    genIdState:    '0x0000000000000000000000000000000000000000000000000000010000000000',
    nonGenIdState: '0x0000000000000000000000000000000000000000000000000000020000000000'
  },
  {
    id: '0xD9C10A0BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE1201',
    idType: '0x0112',
    genIdState:    '0x10A0BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE5E5717281A',
    nonGenIdState: '0x10A1BFB514F30B64E115D7EEB3D547C240C104E03D4548375669FE5E5717281A'
  },
  { // (Iden3, NoChain, NoNetwork)
    id: '0x00141300000000000000000000000000000000000000000000000000000001',
    idType: '0x0100',
    // only first 27 bytes are used, so last 5 bytes do not influence the result
    genIdState:    '0x1300000000000000000000000000000000000000000000000000001111111111',
    nonGenIdState: '0x1200000000000000000000000000000000000000000000000000001111111111'
  },
  { // (PolygonId, NoChain, NoNetwork)
    id: '0x151300000000000000000000000000000000000000000000000000000002',
    idType: '0x0200',
    // only first 27 bytes are used, so last 5 bytes do not influence the result
    genIdState:    '0x130000000000000000000000000000000000000000000000000000ffffffffff',
    nonGenIdState: '0x140000000000000000000000000000000000000000000000000000ffffffffff'
  },
  { // (PolygonId, Polygon, Main)
    id: '0x00261300000000000000000000000000000000000000000000000000001102',
    idType: '0x0211',
    genIdState:    '0x1300000000000000000000000000000000000000000000000000000000000000',
    nonGenIdState: '0x2300000000000000000000000000000000000000000000000000000000000000'
  },
  { // (PolygonId, Polygon, Mumbai)
    id: '0x00271300000000000000000000000000000000000000000000000000001202',
    idType: '0x0212',
    genIdState:    '0x1300000000000000000000000000000000000000000000000000000000000000',
    nonGenIdState: '0x1310000000000000000000000000000000000000000000000000000000000000'
  },
  { // generated in go-iden3-core
    id: '0x0d9cfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0101201',
    idType: '0x0112',
    genIdState:    '0xfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0101111111111',
    nonGenIdState: '0xfe69563748453de004c140c147d5b3eed715e1640bf314b5bfa0101111111111'
  },
  {
    id: '0x0c721a2817575efe69563748453de004c140c247d5b3eed715e1640bf31201',
    idType: '0x0112',
    genIdState:    '0x1a2817575efe69563748453de004c140c247d5b3eed715e1640bf314b5bfa010',
    nonGenIdState: '0x1a2817175efe69563748453de004c140c247d5b3eed715e1640bf314b5bfa011'
  },
  {
    id: '0x0d9cfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0101201',
    idType: '0x0112',
    // only first 27 bytes are used, so last 5 bytes do not influence the result
    genIdState:    '0xfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0100000000000',
    nonGenIdState: '0xfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0110000000000'
  },
  {
    id: '0x0d9cfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0101201',
    idType: '0x0112',
    // only first 27 bytes are used, so last 5 bytes do not influence the result
    genIdState:    '0xfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa010ffffffffff',
    nonGenIdState: '0xfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa011ffffffffff'
  },
  {
    id: '0x0bd8c3e9254b0becbf3d7b01d0f562e417adb4c13d453544485c013f290100',
    idType: '0x0001',
    genIdState:    '0xc3e9254b0becbf3d7b01d0f562e417adb4c13d453544485c013f29eeeeeeeeee',
    nonGenIdState: '0xc3e9254b0becbf3d7b01d0f562e417adb4c13d453554485c013f29eeeeeeeeee'
  },
  {
    id: '0x100a56791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf1201',
    idType: '0x0112',
    genIdState:    '0x56791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf0000000000',
    nonGenIdState: '0x56791df9964673d9965def42a56e49c9b89964b7b4c3c5a897fcbf0000000000'
  },
  {
    id: '0x0e00e026bb4afefadf93bd00644ad2139045a95edbf026e67c4f9318120000',
    idType: '0x0000',
    genIdState:    '0xe026bb4afefadf93bd00644ad2139045a95edbf026e67c4f931812dddddddddd',
    nonGenIdState: '0xe026bb4afefadf93bd00644ad2139045a95edbf026e67c4f921812dddddddddd'
  },
  {
    id: '0x0de4d119a5c0b9fe1659620b8a635024d5ed0fed3cc9f5f20403a9ff480000',
    idType: '0x0000',
    genIdState:    '0xd119a5c0b9fe1659620b8a635024d5ed0fed3cc9f5f20403a9ff48aaaaaaaaaa',
    nonGenIdState: '0xd219a5c0b9fe1669620b8a635024d5ed0fed3cc9f5f20403a9ff49'
  },
  {
    id: '0x0ff856791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf0001',
    idType: '0x0100',
    genIdState:    '0x56791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf0000000000',
    nonGenIdState: '0x76791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf0000000000'
  },
];

before(async () => {
  const deployHelper = await DeployHelper.initialize();
  guWrpr = await deployHelper.deployGenesisUtilsWrapper();
});

describe("generate ID from genesis state and idType", function () {
    for (let i = 0; i < testVectors.length; i++) {
      it("testVector: " + i, async () => {
        const idResult = await guWrpr.calcIdFromGenesisState(testVectors[i].idType, testVectors[i].genIdState);
        expect(BigInt(idResult)).to.be.equal(BigInt(testVectors[i].id));
      });
    }
});

describe("check provided IDs in the genesis state", function () {
  for (let i = 0; i < testVectors.length; i++) {
    it("testVector: " + i, async () => {
      const genResult = await guWrpr.isGenesisState(testVectors[i].id, testVectors[i].genIdState);
      expect(genResult).to.be.true;

      const nonGenResult = await guWrpr.isGenesisState(testVectors[i].id, testVectors[i].nonGenIdState);
      expect(nonGenResult).to.be.false;
    });
  }
});

describe("test is genesis state with base 10 bigint", function () {
    const id = '24046132560195495514376446225096639477630837244209093211332602837583401473';
    const genesis = '7521024223205616003431860562270429547098131848980857190502964780628723574810';
    it("base 10 bigint test", async () => {
      const idResult = await guWrpr.calcIdFromGenesisState('0x0112', genesis); 
      expect(idResult).eq(id);
      const genResult = await guWrpr.isGenesisState(id, genesis);
      expect(genResult).to.be.true;
  });

});

describe("test calculate id from ETH address", function () {
    const expectedId = '23006274145546572515053798212160025855323582904648170675239778444296327681';
    let address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    // address LE 256 bits
    let addressLE = '0x6622B9FFCF797282B86ACEF4F688AD1AE5D69FF3000000000000000000000000';
    it("calcOnchainIdFromAddress", async () => {
      const idResultFromAddress = await guWrpr.calcOnchainIdFromAddress('0x0112', address);
      const idResultFromGenesis = await guWrpr.calcIdFromGenesisState('0x0112', addressLE); 
      expect(idResultFromAddress).eq(expectedId);
      expect(idResultFromGenesis).eq(idResultFromAddress);
  });

});