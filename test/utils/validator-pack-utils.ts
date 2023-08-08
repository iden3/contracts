 import { ethers } from "hardhat";
 import Web3 from 'web3';
 
 export function packValidatorParams(query: any, allowedIssuers: any[] = []) {
    let web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");
    return web3.eth.abi.encodeParameter(
        {
            "CredentialAtomicQuery": {
                "schema": 'uint256',
                "claimPathKey": 'uint256',
                "operator": 'uint256',
                "value": 'uint256[]',
                "queryHash": 'uint256',
                "allowedIssuers": 'uint256[]'
            }
        },
        {
            "schema": query.schema,
            "claimPathKey": query.claimPathKey,
            "operator": query.operator,
            "value": query.value,
            "queryHash": query.queryHash,
            "allowedIssuers": allowedIssuers
        }
    );
 }
