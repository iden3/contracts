 import { ethers } from "hardhat";
 
 function calcBytesFromBigNumber(num: any) {
      let schemaHex = num.toHexString().substring(2);
      schemaHex = '0'.repeat(64 - schemaHex.length) + schemaHex;
      return schemaHex;
  }

  export function prepareQuery(query: any, queryAllowedIssuers: any[]) {
     const schema = query.schema;
      const schemaHex = calcBytesFromBigNumber(schema);
        const claimPathKey = query.claimPathKey;
        const claimPathKeyHex = calcBytesFromBigNumber(claimPathKey);
        const operator = query.operator;
        const operatorHex = calcBytesFromBigNumber(operator);
        let valueHex = '';
        for (let i = 0; i < query.value.length; i++) {
            let value = calcBytesFromBigNumber(query.value[i]);
            valueHex += value;
        }
       
        const queryHash = query.queryHash;
        const queryHashHex = calcBytesFromBigNumber(queryHash);

        let allowedIssuers = '';
        for (let i = 0; i < 20; i++) {
            let issuer = calcBytesFromBigNumber(queryAllowedIssuers && queryAllowedIssuers[i] || ethers.BigNumber.from(0));
            allowedIssuers += issuer;
        }
        const bytes = `0x` + schemaHex + claimPathKeyHex + operatorHex + valueHex + queryHashHex + allowedIssuers;
        return bytes;
  }