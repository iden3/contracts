import { HardhatUserConfig, task } from "hardhat/config";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ignition-ethers";

const DEFAULT_MNEMONIC =
  "test test test test test test test test test test test junk";

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
        version: "0.8.26",
      },
    ],
  },
  networks: {
    // polygon: {
    //   chainId: 137,
    //   url: `${process.env.POLYGON_RPC_URL}`,
    //   accounts: [`0x${process.env.POLYGON_PRIVATE_KEY}`],
    // },
    // mumbai: {
    //   chainId: 80001,
    //   url: `${process.env.MUMBAI_RPC_URL}`,
    //   accounts: [`0x${process.env.MUMBAI_PRIVATE_KEY}`],
    // },
    // 'privado-main': {
    //   chainId: 21000,
    //   url: `${process.env.PRIVADO_MAIN_RPC_URL}`,
    //   accounts: [`0x${process.env.PRIVADO_MAIN_PRIVATE_KEY}`],
    // },
    // 'privado-test': {
    //   chainId: 21001,
    //   url: `${process.env.PRIVADO_TEST_RPC_URL}`,
    //   accounts: [`0x${process.env.PRIVADO_TEST_PRIVATE_KEY}`],
    // },
    // amoy: {
    //   chainId: 80002,
    //   url: `${process.env.AMOY_RPC_URL}`,
    //   accounts: [`0x${process.env.AMOY_PRIVATE_KEY}`],
    // },
    // 'linea-sepolia': {
    //   chainId: 59141,
    //   url: `${process.env.SEPOLIA_RPC_URL}`,
    //   accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
    // },
    // 'privado-main': {
    //   chainId: 21000,
    //   url: `${process.env.PRIVADO_MAIN_RPC_URL}`,
    //   accounts: [`0x${process.env.PRIVADO_MAIN_PRIVATE_KEY}`],
    // },
    // 'privado-test': {
    //   chainId: 21001,
    //   url: `${process.env.PRIVADO_TEST_RPC_URL}`,
    //   accounts: [`0x${process.env.PRIVADO_TEST_PRIVATE_KEY}`],
    // },
    // cardona: {
    //   chainId: 2442,
    //   url: `https://rpc.cardona.zkevm-rpc.com`,
    //   accounts: [`0x${process.env.CARDONA_ZKEVM_PRIVATE_KEY}`],
    // },
    // zkevm: {
    //   chainId: 1101,
    //   url: `https://zkevm-rpc.com`,
    //   accounts: [`0x${process.env.ZKEVM_PRIVATE_KEY}`],
    // },
    // "linea-sepolia": {
    //   chainId: 59141,
    //   url: `${process.env.LINEA_SEPOLIA_RPC_URL}`,
    //   accounts: [`0x${process.env.LINEA_SEPOLIA_PRIVATE_KEY}`],
    // },
    // hardhat: {
    //   chainId: 2442,
    //   forking: {
    //     url: `${process.env.RPC_URL}`,
    //   },
    // },
    // hardhat: {
    //   chainId: 80002,
    //   forking: {
    //     url: `${process.env.AMOY_RPC_URL}`,
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
    //       privateKey: process.env.AMOY_PRIVATE_KEY as string,
    //       balance: "1000000000000000000000000",
    //     },
    //   ],
    // },
    localhost: {
      url: "http://127.0.0.1:8545",
      timeout: 100000000,
      /* accounts: {
        mnemonic: DEFAULT_MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      }, */
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

  // etherscan: {
  //     apiKey: "etherscan API key"
  // },
  ignition: {
    strategyConfig: {
      create2: {
        salt: "0x000000000000000000000000000000000000000000f4179bc3e4988a1a06f8d1", // 20 bytes: zero address; 1 byte: 00 - no cross chain protection, 11 bytes - random salt.
      },
    },
  },

  etherscan: {
    apiKey: {
      amoy: process.env.POLYGON_API_KEY || "",
      polygon: process.env.POLYGON_API_KEY || "",
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
