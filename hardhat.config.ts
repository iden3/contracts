import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatIgnitionPlugin from "@nomicfoundation/hardhat-ignition";
import hardhatLedgerPlugin from "@nomicfoundation/hardhat-ledger";
import hardhatContractSizer from "@solidstate/hardhat-contract-sizer";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
dotenv.config();

const LEDGER_ACCOUNT = process.env.LEDGER_ACCOUNT || "0x0000000000000000000000000000000000000000";

export default defineConfig({
  plugins: [
    hardhatToolboxMochaEthers,
    hardhatIgnitionPlugin,
    hardhatLedgerPlugin,
    hardhatContractSizer,
    hardhatVerify,
  ],
  solidity: {
    compilers: [
      {
        version: "0.8.27",
      },
    ],
    npmFilesToBuild: [
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol",
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
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
      type: "http",
      chainId: 21000,
      url: `${process.env.PRIVADO_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "privado-testnet": {
      type: "http",
      chainId: 21001,
      url: `${process.env.PRIVADO_TESTNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "billions-mainnet": {
      type: "http",
      chainId: 45056,
      url: `${process.env.BILLIONS_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "billions-testnet": {
      type: "http",
      chainId: 6913,
      url: `${process.env.BILLIONS_TESTNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "polygon-mainnet": {
      type: "http",
      chainId: 137,
      url: `${process.env.POLYGON_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "polygon-amoy": {
      type: "http",
      chainId: 80002,
      url: `${process.env.POLYGON_AMOY_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "ethereum-mainnet": {
      type: "http",
      chainId: 1,
      url: `${process.env.ETHEREUM_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "ethereum-sepolia": {
      type: "http",
      chainId: 11155111,
      url: `${process.env.ETHEREUM_SEPOLIA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "zkevm-mainnet": {
      type: "http",
      chainId: 1101,
      url: `${process.env.ZKEVM_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "zkevm-cardona": {
      type: "http",
      chainId: 2442,
      url: `${process.env.ZKEVM_CARDONA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "linea-mainnet": {
      type: "http",
      chainId: 59144,
      url: `${process.env.LINEA_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "linea-sepolia": {
      type: "http",
      chainId: 59141,
      url: `${process.env.LINEA_SEPOLIA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "base-mainnet": {
      type: "http",
      chainId: 8453,
      url: `${process.env.BASE_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "base-sepolia": {
      type: "http",
      chainId: 84532,
      url: `${process.env.BASE_SEPOLIA_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "bnb-mainnet": {
      type: "http",
      chainId: 56,
      url: `${process.env.BNB_MAINNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    "bnb-testnet": {
      type: "http",
      chainId: 97,
      url: `${process.env.BNB_TESTNET_RPC_URL}`,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      ledgerAccounts: [`${LEDGER_ACCOUNT}`],
    },
    // hardhat: {
    //   chainId: 80002,
    //   type: "edr-simulated",
    //   forking: {
    //     url: `${process.env.POLYGON_AMOY_RPC_URL}`,
    //   },
    //   accounts: [
    //     {
    //       privateKey: process.env.PRIVATE_KEY as string,
    //       balance: "1000000000000000000000000",
    //     },
    //   ],
    // },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
      timeout: 100000000,
      // accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
    },
  },
  typechain: {
    outDir: "typechain",
    discriminateTypes: true,
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
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
  },
  chainDescriptors: {
    6913: {
      name: "billions-testnet",
      blockExplorers: {
        etherscan: {
          name: "billions-testnet",
          url: "https://billions-testnet-blockscout.eu-north-2.gateway.fm/api/",
          apiUrl: "abc",
        },
      },
    },
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: false,
    strict: false,
    flat: true,
  },
});
