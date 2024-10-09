import { HardhatUserConfig, task } from "hardhat/config";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-ledger";
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
  },
  networks: {
    "privado-main": {
      chainId: 21000,
      url: `${process.env.PRIVADO_MAIN_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${process.env.LEDGER_ACCOUNT}`],
    },
    "privado-test": {
      chainId: 21001,
      url: `${process.env.PRIVADO_TEST_RPC_URL}`,
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
    // hardhat: {
    //   chainId: 80002,
    //   forking: {
    //     url: `${process.env.POLYGON_AMOY_RPC_URL}`,
    //   },
    //   chains: {
    //     80002: {
    //       hardforkHistory: {
    //         london: 10000000,
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

  ignition: {
    strategyConfig: {
      create2: {
        salt: "0x000000000000000000000000000000000000000000f4179bc3e4988a1a06f8d1", // 20 bytes: zero address; 1 byte: 00 - no cross chain protection, 11 bytes - random salt.
      },
    },
    requiredConfirmations: 5,
  },

  etherscan: {
    apiKey: {
      amoy: process.env.POLYGON_API_KEY || "",
      polygon: process.env.POLYGON_API_KEY || "",
      sepolia: process.env.ETHEREUM_API_KEY || "",
      ethereum: process.env.ETHEREUM_API_KEY || "",
      linea: process.env.LINEA_API_KEY || "",
      "linea-sepolia": process.env.LINEA_API_KEY || "",
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://docs.polygonscan.com",
        },
      },
      {
        network: "linea-sepolia",
        chainId: 59141,
        urls: {
          apiURL: "https://api-sepolia.lineascan.build/api",
          browserURL: "https://sepolia.lineascan.build",
        },
      },
    ],
  },
};

export default config;
