# IDEN3 Smart Contracts [![Test](https://github.com/iden3/contracts/workflows/Tests/badge.svg)](https://github.com/iden3/contracts/actions?query=workflow%3ATests)

- State - State contract, where identity states are published
- Smt - library to manage Sparse Merkle Trees onchain

## Security Audits

1. [Nethermind](https://nethermind.io/smart-contracts-audits/) has performed a security audit of our core smart contracts (State & Smt) and compiled a report on Apr 18, 2023: 
   [NM_0069_POLYGON_FINAL.pdf](https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/audit_reports/NM_0069_POLYGON_FINAL.pdf)

2. [Nethermind](https://nethermind.io/smart-contracts-audits/) has performed a second security audit of our core smart contracts (State, IdentityBase, GenesisUtils, OnChainIdentity) and compiled a report on Sep 13, 2023:
   [NM0113-FINAL-POLYGONID.pdf](https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/audit_reports/NM0113-FINAL-POLYGONID.pdf)

## Deployment

Uncomment networks object and updated blockchain provider **url** and **private key** in `hardhat.config.js` for the relevant network.
Then run the deployment script:

```shell
npx hardhat run --network <your-network> scripts/deploy.js
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
