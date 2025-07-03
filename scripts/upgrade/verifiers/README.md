# Upgrading Universal Verifier
The verifier upgrade script executes upgrade for the Universal Veifier contract.

## Steps to execute the upgrade script
1. The module with corresponding version for the upgrade will be defined by the contract version.
2. Configure the network you want to upgrade in `hardhat.config.ts` and execute upgrade script.
Example in amoy:
    ```bash
    npx hardhat run scripts/upgrade/verifiers/universal-verifier-upgrade.ts --network amoy
    ```

## Test verification after the upgrade
After the uprade you can test verification with the maintenance script `checkUniversalVerifierSingleNetwork.ts` doing the proper updates to the script for the verifier addresses. This script sets a requestId and sends `submitResponse` for the user that has a KYCAgeCredential generated from an issuer in the same network.

You can execute the verification with this command:
```
npx hardhat run scripts/maintenance/checkUniversalVerifierSingleNetwork.ts --network <network>
```