# Issue with zkEVM networks
For supporting zkEVM networks we execute a patch in postinstall through `package.json` that patches hardhat-ledger plugin
```
"postinstall": "patch-package"
```

## Patch fixes
- `eth_accounts` it's not supported in zkEVM so we needed to replace this code in `provider.js`

  ```
  if (args.method === "eth_accounts") {
      const accounts = (await this._wrappedProvider.request(args));
      return [...accounts, ...this.options.accounts];
  }
  ```

  with this

  ```
  if (args.method === "eth_accounts") {
      const chainId = await this._getChainId();
      const accounts = chainId == 2442 || chainId == 1101 ? [] : (await this._wrappedProvider.request(args));
      return [...accounts, ...this.options.accounts];
  }
  ```
- Hardhat ledger plugin doesn't work with zkEVM and type `EIP-1559` transactions so we have to change to `LegacyTransaction` and needed to replace this code in `provider.js`.

  ```
  const txToSign = ethers_1.ethers.Transaction.from(baseTx).unsignedSerialized.substring(2);

  ```

  with this

  ```
  if (chainId == 2442 || chainId == 1101) {
      baseTx.type = 0;
  }
  const txToSign = ethers_1.ethers.Transaction.from(baseTx).unsignedSerialized.substring(2);

  ```


If you need to debug `params` for the `eth_sendRawTransaction` if you find any issues you could uncomment `console.log` in `async _ethSendTransaction(params)` method and decode it using this online tool `https://rawtxdecode.in/` using the params content as Raw Transaction Hex and `[]` as Smart Contract ABI.