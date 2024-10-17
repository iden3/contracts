# Upgrading Universal Verifier
In order to test verification after upgrade, there is a check test for `submitZKPResponse` and `submitZKPResponseV2` functions of the Universal Verifier. 
For this test we use `js-sdk` and we need to download circuits for the verification.

The verifier upgrade script executes:
- Upgrade State contract
- Upgrade Universal Verifier contract
- Test verification for a requestId from user that has a KYCAgeCredential generated from an issuer in the same network of the deployment.

## Steps to execute the upgrade script

1. Download the zk circuits into `./circuits` by running `dl_circuits.sh`. This will download the latest files from `https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/latest.zip`

    ```bash
    ./dl_circuits.sh
    ```
2. Configure the network you want to upgrade in `hardhat.config.ts` and execute upgrade script.
Example in amoy:
    ```bash
    npx hardhat run scripts/upgrade/verifiers/universal-verifier-upgrade.ts --network amoy
    ```
