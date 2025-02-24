# Issue with zkEVM networks
For supporting zkEVM networks we execute a patch in postinstall through `package.json` that patches hardhat-ledger plugin
```
"postinstall": "patch-package"
```

## Patch fixes
- `eth_accounts` it's not supported in zkEVM RPC or other chains.
- Hardhat ledger plugin doesn't work with zkEVM and chains that doesn't support type `EIP-1559` transactions.
