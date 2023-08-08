import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

describe("Pack utils test", () => {
  let packUtils;

  const calcBytesFromInt = (num) => {
      let schemaHex = num.toString(16);
      schemaHex = '0'.repeat(64 - schemaHex.length) + schemaHex;
      return schemaHex;
  }

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    packUtils = await deployHelper.deployPackUtilsWrapper();
  });

    it("pack tests", async () => {
        const schema = 3;
        const schemaHex = calcBytesFromInt(schema);
        const claimPathKey = 4;
        const claimPathKeyHex = calcBytesFromInt(claimPathKey);
        const operator = 12;
        const operatorHex = calcBytesFromInt(operator);

        let valueHex = '';
        for (let i = 0; i < 64; i++) {
            let val = calcBytesFromInt(1);
            valueHex += val;
        }
        const queryHash = 12312312399;
        const queryHashHex = calcBytesFromInt(queryHash);

        let allowedIssuers = '';
        for (let i = 0; i < 20; i++) {
            let issuer = calcBytesFromInt(i);
            allowedIssuers += issuer;
        }

        const bytes = `0x` + schemaHex + claimPathKeyHex + operatorHex + valueHex + queryHashHex + allowedIssuers;
        // console.log(bytes);
        const responce = await packUtils.credentialAtomicQueryUnpack(["1", "metadata", bytes]);
        console.log(responce);
        expect(responce).not.false;
        expect(+responce[2]).to.be.equal(schema);
        expect(+responce[3]).to.be.equal(claimPathKey);
        expect(+responce[4]).to.be.equal(operator);
        expect(+responce[6]).to.be.equal(queryHash);
    });


});