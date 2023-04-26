import { deployGenesisUtilsWrapper } from "../utils/deploy-utils";
import { expect } from "chai";


describe("genesis state tests", function () {
  let guWrpr;

  before(async () => {
    guWrpr = await deployGenesisUtilsWrapper();
  });


  it("check provided IDs in the genesis state", async () => {
    const expectedResults = [
      { // (Iden3, NoChain, NoNetwork)
        id: '0x01000000000000000000000000000000000000000000000000000000131400',
        genIdState:    '0x13',
        nonGenIdState: '0x12'
      },
      { // (PolygonId, NoChain, NoNetwork)
        id: '0x02000000000000000000000000000000000000000000000000000000131500',
        genIdState:    '0x13',
        nonGenIdState: '0x14'
      },
      { // (PolygonId, Polygon, Main)
        id: '0x02110000000000000000000000000000000000000000000000000000132600',
        genIdState:    '0x13',
        nonGenIdState: '0x25'
      },
      { // (PolygonId, Polygon, Mumbai)
        id: '0x02120000000000000000000000000000000000000000000000000000132700',
        genIdState:    '0x13',
        nonGenIdState: '0x32'
      },
      { 
        id: '0x0112fe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0109c0d',
        genIdState:    '0xfe69563748453de004c140c247d5b3eed715e1640bf314b5bfa010',
        nonGenIdState: '0xfe69563748453de004c140c147d5b3eed715e1640bf314b5bfa010'
      },
      {
        // generated in go-iden3-core
        id: '0x0112fe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0109c0d',
        genIdState:    '0x1a2817575efe69563748453de004c140c247d5b3eed715e1640bf314b5bfa010',
        nonGenIdState: '0x1a2817575efe69563748453de004c140c247d5b3eed715e1640bf314b5bfa011'
      },
      {
        id: '0x0112fe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0109c0d',
        // only lower 27 bytes are used, so first 5 bytes do not influence the result
        genIdState:    '0x0000000000fe69563748453de004c140c247d5b3eed715e1640bf314b5bfa010',
        nonGenIdState: '0x0000000000fe69563748453de004c140c247d5b3eed715e1640bf314b5bfa011'
      },
      {
        id: '0x0112fe69563748453de004c140c247d5b3eed715e1640bf314b5bfa0109c0d',
        // only lower 27 bytes are used, so first 5 bytes do not influence the result
        genIdState:    '0xfffffffffffe69563748453de004c140c247d5b3eed715e1640bf314b5bfa010',
        nonGenIdState: '0xfffffffffffe69563748453de004c140c247d5b3eed715e1640bf314b5bfa011'
      },
      {
        id: '0x0001c3e9254b0becbf3d7b01d0f562e417adb4c13d453544485c013f29d80b',
        genIdState:    '0xc3e9254b0becbf3d7b01d0f562e417adb4c13d453544485c013f29',
        nonGenIdState: '0xc3e9254b0becbf3d7b01d1f562e517adb3c13d453544485c013f29'
      },
      { 
        id: '0x011256791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf0a10',
        genIdState:    '0x56791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf',
        nonGenIdState: '0x56791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcaa'
      },
      { 
        id: '0x0000e026bb4afefadf93bd00644ad2139045a95edbf026e67c4f931812000e',
        genIdState:    '0xe026bb4afefadf93bd00644ad2139045a95edbf026e67c4f931812',
        nonGenIdState: '0xe126bb4afefadf93bd00644ad2139045a95edbf026e67c4f931812'
      },
      { 
        id: '0x0000d119a5c0b9fe1659620b8a635024d5ed0fed3cc9f5f20403a9ff48e40d',
        genIdState:    '0xd119a5c0b9fe1659620b8a635024d5ed0fed3cc9f5f20403a9ff48',
        nonGenIdState: '0xd219a5c0b9fe1669620b8a635024d5ed0fed3cc9f5f20403a9ff49'
      },
      { 
        id: '0x010056791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbff80f',
        genIdState:    '0x56791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf',
        nonGenIdState: '0x76791df9964673d9965def42a56e49c9b89964b7b4c2c5a897fcbf'
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
