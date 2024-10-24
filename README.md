# IDEN3 Smart Contracts [![Test](https://github.com/iden3/contracts/workflows/Tests/badge.svg)](https://github.com/iden3/contracts/actions?query=workflow%3ATests)

All the contracts are deployed using [**CreateX**](https://createx.rocks/) contract factories via [deployCreate2(salt,initCode)](https://github.com/pcaversaccio/createx/blob/main/src/CreateX.sol#L332)  function, so reside on the same addresses across all networks deployed.

The contracts were deployed via [TransparentUpgradeableProxy](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/transparent/TransparentUpgradeableProxy.sol) pattern, so they can be upgraded by our team in the future if needed.

## Smart contracts with unified addresses

|     Smart contract      |     Address                                |
|:-----------------------:|:------------------------------------------:|
|       **State***        | 0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896 |
|    **Validator MTP**    | 0x27bDFFCeC5478a648f89764E22fE415486A42Ede |
|    **Validator SIG**    | 0x59B347f0D3dd4B98cc2E056Ee6C53ABF14F8581b |
|    **Validator V3**     | 0xd179f29d00Cd0E8978eb6eB847CaCF9E2A956336 |
| **Universal Verifier**  | 0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c |
| **Identity Tree Store** | 0x7dF78ED37d0B39Ffb6d4D527Bb1865Bf85B60f81 |


*The only exception are the State contracts for **Polygon Mainnet** and **Polygon Amoy testnet**, which where deployed before the unified address methodology was implemented.

- Polygon Amoy testnet State Contract: **0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124**
- Polygon PoS mainnet State Contract : **0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D**

## Libraries on unified addresses
There are a few libraries, which does not tend to evolve much but can be re-used in many other contracts, e.g. custom onchain-identity. They reside on the same addresses across all networks deployed and serve both project needs and as a public good. Obviously, they are not upgradable.

|      Library       |     Address                                |
|:------------------:|:------------------------------------------:|
|    **SmtLib***     | 0x682364078e26C1626abD2B95109D2019E241F0F6 |
| **PoseidonUnit1L** | 0xC72D76D7271924a2AD54a19D216640FeA3d138d9 |
| **PoseidonUnit2L** | 0x72F721D9D5f91353B505207C63B56cF3d9447edB |
| **PoseidonUnit3L** | 0x5Bc89782d5eBF62663Df7Ce5fb4bc7408926A240 |
| **PoseidonUnit4L** | 0x0695cF2c6dfc438a4E40508741888198A6ccacC2 |

## Networks
We have deployed contracts across the following mainnets and testnets so far (**State** contract links below):

**Mainnets**:

- [Ethereum](https://etherscan.io/address/0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896)
- [Polygon POS](https://polygonscan.com/address/0x624ce98d2d27b20b8f8d521723df8fc4db71d79d)
- [Polygon zkEVM](https://zkevm.polygonscan.com/address/0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896)
- [Linea](https://lineascan.build/address/0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896)
- Privado Mainnet

**Testnets**:

- [Ethereum Sepolia](https://sepolia.etherscan.io/address/0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896)
- [Polygon Amoy](https://amoy.polygonscan.com/address/0x1a4cc30f2aa0377b0c3bc9848766d90cb4404124)
- [Polygon zkEVM Cardona](https://cardona-zkevm.polygonscan.com/address/0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896)
- [Linea-Sepolia](https://sepolia.lineascan.build/address/0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896)
- Privado Testnet


## Security Audits

1. [Nethermind](https://nethermind.io/smart-contracts-audits/) has performed a security audit of our core smart contracts (State & Smt) and compiled a report on Apr 18, 2023: 
   [NM_0069_POLYGON_FINAL.pdf](https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/audit_reports/NM_0069_POLYGON_FINAL.pdf)

2. [Nethermind](https://nethermind.io/smart-contracts-audits/) has performed a second security audit of our core smart contracts (State, IdentityBase, GenesisUtils, OnChainIdentity) and compiled a report on Sep 13, 2023:
   [NM0113-FINAL-POLYGONID.pdf](https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/audit_reports/NM0113-FINAL-POLYGONID.pdf)

## Deployment methodology with CREATE2 and ledger

Note, that this methodology is not what expected to be used by the repository users as its purpose is mainly for our team to deploy and maintain the contracts across many networks in a unified way. However, it can be used as a reference for the deployment process.

The deployment is configured to be done with Ledger device for signing the transactions.
You should configure your Ledger device for `blind signing` in your Ethereum app.
If your device is not detected then review USB connection issues [here](https://support.ledger.com/article/115005165269-zd).

Configure a `.env` file for deployments like this and fill the `LEDGER_ACCOUNT` with your Ledger account address and the desired network rpc urls where you want to deploy.
```
LEDGER_ACCOUNT="<your Ledger deployer address>"

DEPLOY_STRATEGY=create2

PRIVADO_MAIN_RPC_URL=<rpc url for privado main>
PRIVADO_TEST_RPC_URL=<rpc url for privado test>
POLYGON_MAINNET_RPC_URL=<rpc url for polygon mainnet>
POLYGON_AMOY_RPC_URL=<rpc url for polygon amoy>
ETHEREUM_MAINNET_RPC_URL=<rpc url for ethereum mainnet>
ETHEREUM_SEPOLIA_RPC_URL=<rpc url for ethereum sepolia>
ZKEVM_MAINNET_RPC_URL=<rpc url for zkevm mainnet>
ZKEVM_CARDONA_RPC_URL=<rpc url for zkevm cardona>
LINEA_MAINNET_RPC_URL=<rpc url for linea mainnet>
LINEA_SEPOLIA_RPC_URL=<rpc url for linea sepolia>
```

Then run the deployment scripts:

1. Deploy create2AnchorAddress that we use for unified addresses
   ```shell
   npx hardhat run scripts/deploy/deployCreate2AddressAnchor.ts --network <your-network>
   ```
2. Deploy libraries contracts
   ```shell
   npx hardhat run scripts/deploy/deployLibraries.ts --network <your-network>
   ```
3. Deploy State contract
   ```shell
   npx hardhat run scripts/deploy/deployState.ts --network <your-network>
   ```
4. Deploy Identity Tree Store contract
   ```
   npx hardhat run scripts/deploy/deployIdentityTreeStore.ts --network <your-network>
   ```
5. Deploy Validators contracts
   ```
   npx hardhat run scripts/deploy/deployValidators.ts --network <your-network>
   ```
6. Deploy Universal Verifier contract
   ```
   npx hardhat run scripts/deploy/deployUniversalVerifier.ts --network <your-network>
   ```
7. Add validators to whitelisted validators in Universal Verifier
   ```
   npx hardhat run scripts/maintenance/addValidatorsToUniversalVerifier.ts --network <your-network>
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

## Circuits needed for some maintenance and upgrade scripts
For some of the scripts you need to download the zk circuits for generation and verification of the proofs.
Download the zk circuits into `./scripts/upgrade/verifiers/helpers/circuits` by running `./scripts/upgrade/verifiers/helpers/dl_circuits.sh`. This will download the latest files from `https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/latest.zip`

    ```bash
    cd ./scripts/upgrade/verifiers/helpers 
    ./dl_circuits.sh
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
