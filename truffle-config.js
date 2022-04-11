/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a 
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() { 
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>') 
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    ropsten: {
      provider: function() {
        return new HDWalletProvider(["key here"], "url here")
      },
      network_id: 3
    },
    mumbai: {
      provider: function() {
        return new HDWalletProvider(["key here"], "url here")
      },
      network_id: 80001
    },
    development: {
      host: "localhost",
      port: 8545,
      network_id: "5777"
    }
  },
  // TODO (illia-korotia): currently, we can't use different versions of compiler for contract and lib.
  // Please, watch this issue. Maybe in the future `truffle` will has this feature.
  // https://github.com/trufflesuite/truffle/issues/2021#issuecomment-1079961241
  compilers: {
    solc: {
      version: "pragma"
    }
  }
};
