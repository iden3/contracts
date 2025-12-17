import { HardhatUserConfig, task } from "hardhat/config";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-ledger";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";
const DEFAULT_ACCOUNTS: any = {
  mnemonic: DEFAULT_MNEMONIC,
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 20,
};

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.27",
      },
    ],
    overrides: {
      "contracts/verifiers/UniversalVerifier.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 80,
          },
        },
      },
      "contracts/test-helpers/VerifierTestWrapper.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/test-helpers/UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 80,
          },
        },
      },
      "contracts/test-helpers/EmbeddedVerifierWrapper.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/test-helpers/RequestDisableableTestWrapper.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/test-helpers/RequestOwnershipTestWrapper.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/test-helpers/ValidatorWhitelistTestWrapper.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/state/State.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/lib/VerifierLib.sol": {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    "privado-mainnet": {
      chainId: 21000,
      url: `${process.env.PRIVADO_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "privado-testnet": {
      chainId: 21001,
      url: `${process.env.PRIVADO_TESTNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "billions-mainnet": {
      chainId: 45056,
      url: `${process.env.BILLIONS_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "billions-testnet": {
      chainId: 6913,
      url: `${process.env.BILLIONS_TESTNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "polygon-mainnet": {
      chainId: 137,
      url: `${process.env.POLYGON_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "polygon-amoy": {
      chainId: 80002,
      url: `${process.env.POLYGON_AMOY_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "ethereum-mainnet": {
      chainId: 1,
      url: `${process.env.ETHEREUM_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "ethereum-sepolia": {
      chainId: 11155111,
      url: `${process.env.ETHEREUM_SEPOLIA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "zkevm-mainnet": {
      chainId: 1101,
      url: `${process.env.ZKEVM_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "zkevm-cardona": {
      chainId: 2442,
      url: `${process.env.ZKEVM_CARDONA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "linea-mainnet": {
      chainId: 59144,
      url: `${process.env.LINEA_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "linea-sepolia": {
      chainId: 59141,
      url: `${process.env.LINEA_SEPOLIA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "base-mainnet": {
      chainId: 8453,
      url: `${process.env.BASE_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "base-sepolia": {
      chainId: 84532,
      url: `${process.env.BASE_SEPOLIA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "bnb-mainnet": {
      chainId: 56,
      url: `${process.env.BNB_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "bnb-testnet": {
      chainId: 97,
      url: `${process.env.BNB_TESTNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    // hardhat: {
    //   chainId: 80002,
    //   forking: {
    //     url: `${process.env.POLYGON_AMOY_RPC_URL}`,
    //   },
    //   chains: {
    //     80002: {
    //       hardforkHistory: {
    //         london: 100000,
    //       },
    //     },
    //   },
    //   accounts: [
    //     {
    //       privateKey: process.env.PRIVATE_KEY as string,
    //       balance: "1000000000000000000000000",
    //     },
    //   ],
    // },
    localhost: {
      url: "http://127.0.0.1:8545",
      timeout: 100000000,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
    },
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_KEY,
    enabled: !!process.env.REPORT_GAS,
    token: "MATIC",
    gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice", // MATIC
    // gasPriceAPI: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice", // ETH
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: false,
  },
  ignition: {
    strategyConfig: {
      create2: {
        salt: "0x000000000000000000000000000000000000000000f4179bc3e4988a1a06f8d1",
        // 20 bytes: zero address; 1 byte: 00 - no cross chain protection, 11 bytes - random salt.
        //
        // CreateX implements different safeguarding mechanisms depending on the encoded values in the salt
        // * (`||` stands for byte-wise concatenation):
        // => salt (32 bytes) = 0xbebebebebebebebebebebebebebebebebebebebe||ff||1212121212121212121212
        // *   - The first 20 bytes (i.e. `bebebebebebebebebebebebebebebebebebebebe`) may be used to
        // *     implement a permissioned deploy protection by setting them equal to `msg.sender`,
        //       -> In our case we set it to zero address to disable this protection
        // *   - The 21st byte (i.e. `ff`) may be used to implement a cross-chain redeploy protection by
        // *     setting it equal to `0x01`,
        //       -> In our case we set it to `0x00` to disable this protection
        // *   - The last random 11 bytes (i.e. `1212121212121212121212`) allow for 2**88 bits of entropy
        // *     for mining a salt.
        //      -> In our case f4179bc3e4988a1a06f8d1
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=8453",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "bnb-testnet",
        chainId: 97,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=97",
          browserURL: "https://testnet.bscscan.com",
        },
      },
      {
        network: "bnb-mainnet",
        chainId: 56,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=56",
          browserURL: "https://bscscan.com",
        },
      },
      {
        network: "billions-testnet",
        chainId: 6913,
        urls: {
          apiURL: "https://billions-testnet-blockscout.eu-north-2.gateway.fm/api/",
          browserURL: "https://docs.blockscout.com",
        },
      },
      {
        network: "billions-mainnet",
        chainId: 45056,
        urls: {
          apiURL: "https://billions-blockscout.eu-north-2.gateway.fm/api/",
          browserURL: "https://docs.blockscout.com",
        },
      },
      {
        network: "polygon-amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=80002",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "polygon-mainnet",
        chainId: 137,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=137",
          browserURL: "https://polygonscan.com",
        },
      },
      {
        network: "linea-sepolia",
        chainId: 59141,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=59141",
          browserURL: "https://sepolia.lineascan.build",
        },
      },
      {
        network: "linea-mainnet",
        chainId: 59144,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=59144",
          browserURL: "https://lineascan.build",
        },
      },
      {
        network: "zkevm-cardona",
        chainId: 2442,
        urls: {
          apiURL: "https://api-cardona-zkevm.polygonscan.com/api",
          browserURL: "https://docs.polygonscan.com/cardona-polygon-zkevm",
        },
      },
      {
        network: "zkevm-mainnet",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://docs.polygonscan.com/polygon-zkevm",
        },
      },
    ],
  },
};

export default config;
