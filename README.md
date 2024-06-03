# IDEN3 Smart Contracts [![Test](https://github.com/iden3/contracts/workflows/Tests/badge.svg)](https://github.com/iden3/contracts/actions?query=workflow%3ATests)

- State - State contract, where identity states are published
- Smt - library to manage Sparse Merkle Trees onchain

## State Contract

|        Network             |     Address                                |
|:--------------------------:|:------------------------------------------:|
| **Polygon Mainnet**        | 0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D |
| **Polygon Amoy testnet**   | 0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124 |
| Polygon Mumbai testnet     | 0x134B1BE34911E39A8397ec6289782989729807a4 |

## IdentityTreeStore contract (On-chain RHS)

|        Network             |     Address                                |
|:--------------------------:|:------------------------------------------:|
| **Polygon Mainnet**        | 0xbEeB6bB53504E8C872023451fd0D23BeF01d320B |
| **Polygon Amoy testnet**   | 0x3d3763eC0a50CE1AdF83d0b5D99FBE0e3fEB43fb |
| Polygon Mumbai testnet     | 0x16A1ae4c460C0a42f0a87e69c526c61599B28BC9 |


## Universal Verifier contract

|        Network             |     Address                                |
|:--------------------------:|:------------------------------------------:|
| **Polygon Mainnet**        | 0x394d1dad46907bd54d15926A1ab4535EF2BF47b1 |
| **Polygon Amoy testnet**   | 0x1B20320042b29AE5c1a3ADc1674cb6bF8760530f |

## Security Audits

1. [Nethermind](https://nethermind.io/smart-contracts-audits/) has performed a security audit of our core smart contracts (State & Smt) and compiled a report on Apr 18, 2023: 
   [NM_0069_POLYGON_FINAL.pdf](https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/audit_reports/NM_0069_POLYGON_FINAL.pdf)

2. [Nethermind](https://nethermind.io/smart-contracts-audits/) has performed a second security audit of our core smart contracts (State, IdentityBase, GenesisUtils, OnChainIdentity) and compiled a report on Sep 13, 2023:
   [NM0113-FINAL-POLYGONID.pdf](https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/audit_reports/NM0113-FINAL-POLYGONID.pdf)

## Deployment

Uncomment networks object and updated blockchain provider **url** and **private key** in `hardhat.config.js` for the relevant network.
Then run the deployment script:

```shell
npx hardhat run --network <your-network> scripts/deployState.ts
```

## Run tests

```shell
npx hardhat test
```

Run tests with gas statistics report:

```shell
REPORT_GAS=true npx hardhat test 
```

Run tests with gas statistics and costs report:

```shell
COINMARKETCAP_KEY=<<your coinmarketcap key>> REPORT_GAS=true npx hardhat test 
```

## Other Hardhat commands

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat node
npx hardhat help
```

## Publish contracts to npm

```shell
cd contracts
npm publish
```

## License

This repository is part of the iden3 project copyright 2023 0KIMS Association and published under GPL-3.0 license. Please check the LICENSE file for more details.
