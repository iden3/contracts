## IDEN3 Smartcontracts [![Test](https://github.com/iden3/contracts/workflows/Tests/badge.svg)](https://github.com/iden3/contracts/actions?query=workflow%3ATests)

- State
- SchemaRegistry
- SchemaUrlRegistry

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
