# IDEN3 Smart Contracts [![Test](https://github.com/iden3/contracts/workflows/Tests/badge.svg)](https://github.com/iden3/contracts/actions?query=workflow%3ATests)

- State - State contract, where identity states are published
- Smt - library to manage Sparse Merkle Trees onchain

## State Contract

|        Network             |     Address                                |
|:--------------------------:|:------------------------------------------:|
| **Polygon Mainnet**        | 0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D |
| **Polygon Amoy testnet**   | 0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124 |
| **Privado Main**           | 0x975556428F077dB5877Ea2474D783D6C69233742 |
| **Privado testnet**        | 0x975556428F077dB5877Ea2474D783D6C69233742 |
| Polygon Mumbai testnet     | 0x134B1BE34911E39A8397ec6289782989729807a4 |

## IdentityTreeStore contract (On-chain RHS)

|        Network             |     Address                                |
|:--------------------------:|:------------------------------------------:|
| **Polygon Mainnet**        | 0xbEeB6bB53504E8C872023451fd0D23BeF01d320B |
| **Polygon Amoy testnet**   | 0x3d3763eC0a50CE1AdF83d0b5D99FBE0e3fEB43fb |
| **Privado Main**           | 0x58485809CfAc875B7E6F54E3fCb5f24614f202e9 |
| **Privado testnet**        | 0x58485809CfAc875B7E6F54E3fCb5f24614f202e9 |
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

The deployment is configured to be done with Ledger device for signing the transactions.
You should configure your Ledger device for `blind signing` in your Ethereum app.
If your device is not detected then review USB connection issues [here](https://support.ledger.com/article/115005165269-zd).

Configure a `.env` file for deployments like this and fill the `LEDGER_ACCOUNT` with your Ledger account address and the desired network rpc urls where you want to deploy.
```
LEDGER_ACCOUNT="<your Ledger deployer address>"

DEPLOY_STRATEGY=create2

STATE_CONTRACT_ADDRESS=
SMT_LIB_CONTRACT_ADDRESS=
POSEIDON_1_CONTRACT_ADDRESS=
POSEIDON_2_CONTRACT_ADDRESS=
POSEIDON_3_CONTRACT_ADDRESS=

IDENTITY_TREE_STORE_CONTRACT_ADDRESS=

UNIVERSAL_VERIFIER_CONTRACT_ADDRESS=
GROTH16_VERIFIER_MTP_CONTRACT_ADDRESS=
GROTH16_VERIFIER_SIG_CONTRACT_ADDRESS=
GROTH16_VERIFIER_V3_CONTRACT_ADDRESS=
VALIDATOR_MTP_CONTRACT_ADDRESS=
VALIDATOR_SIG_CONTRACT_ADDRESS=
VALIDATOR_V3_CONTRACT_ADDRESS=

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
   npx hardhat run scripts/deployCreate2AddressAnchor.ts --network <your-network>
   ```
2. Deploy State contract
   ```shell
   npx hardhat run scripts/deployState.ts --network <your-network>
   ```
   Once state is deployed replace contract addresses with yours from the state deployment in your `.env` file
   ```
   STATE_CONTRACT_ADDRESS=
   SMT_LIB_CONTRACT_ADDRESS=
   POSEIDON_1_CONTRACT_ADDRESS=
   POSEIDON_2_CONTRACT_ADDRESS=
   POSEIDON_3_CONTRACT_ADDRESS=
   ```

3. Deploy Identity Tree Store contract
   ```
   npx hardhat run scripts/deployIdentityTreeStore.ts --network <your-network>
   ```
   Once identity tree store is deployed replace contract address with yours from the identity tree store deployment in your `.env` file
   ```
   IDENTITY_TREE_STORE_CONTRACT_ADDRESS=
   ```
4. Deploy Validators contracts
   ```
   npx hardhat run scripts/deployValidators.ts --network <your-network>
   ```
   Once validators are deployed replace contract addresses with yours from the validators deployment in your `.env` file
   ```
   GROTH16_VERIFIER_MTP_CONTRACT_ADDRESS=
   GROTH16_VERIFIER_SIG_CONTRACT_ADDRESS=
   GROTH16_VERIFIER_V3_CONTRACT_ADDRESS=
   VALIDATOR_MTP_CONTRACT_ADDRESS=
   VALIDATOR_SIG_CONTRACT_ADDRESS=
   VALIDATOR_V3_CONTRACT_ADDRESS=
   ```
5. Deploy Universal Verifier contract
   ```
   npx hardhat run scripts/deployUniversalVerifier.ts --network <your-network>
   ```
   Once the universal verifier is deployd replace the address in your `.env` file
   ```
   UNIVERSAL_VERIFIER_CONTRACT_ADDRESS=
   ```
6. Add validators to whitelisted validators in Universal Verifier
   ```
   npx hardhat run scripts/addValidatorsToUniversalVerifier.ts --network <your-network>
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
