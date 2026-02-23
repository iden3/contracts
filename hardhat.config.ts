import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatIgnitionPlugin from "@nomicfoundation/hardhat-ignition";
import hardhatLedgerPlugin from "@nomicfoundation/hardhat-ledger";
import hardhatContractSizer from "@solidstate/hardhat-contract-sizer";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
import {
  BASE_MAINNET_RPC_URL,
  BASE_SEPOLIA_RPC_URL,
  BILLIONS_MAINNET_RPC_URL,
  BILLIONS_TESTNET_RPC_URL,
  BNB_MAINNET_RPC_URL,
  BNB_TESTNET_RPC_URL,
  ETHEREUM_MAINNET_RPC_URL,
  ETHEREUM_SEPOLIA_RPC_URL,
  ETHERSCAN_API_KEY,
  LEDGER_ACCOUNT,
  LINEA_MAINNET_RPC_URL,
  LINEA_SEPOLIA_RPC_URL,
  POLYGON_AMOY_RPC_URL,
  POLYGON_MAINNET_RPC_URL,
  PRIVADO_MAINNET_RPC_URL,
  PRIVADO_TESTNET_RPC_URL,
  PRIVATE_KEY,
  ZKEVM_CARDONA_RPC_URL,
  ZKEVM_MAINNET_RPC_URL,
} from "./helpers/environment";
dotenv.config();

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";
const DEFAULT_ACCOUNTS: any = {
  mnemonic: DEFAULT_MNEMONIC,
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 20,
};

const accounts: any = {
  ...(LEDGER_ACCOUNT
    ? { ledgerAccounts: [LEDGER_ACCOUNT] }
    : {
        accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : DEFAULT_ACCOUNTS,
      }),
};

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
      url: `${PRIVADO_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "privado-testnet": {
      type: "http",
      chainId: 21001,
      url: `${PRIVADO_TESTNET_RPC_URL}`,
      ...accounts,
    },
    "billions-mainnet": {
      type: "http",
      chainId: 45056,
      url: `${BILLIONS_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "billions-testnet": {
      type: "http",
      chainId: 6913,
      url: `${BILLIONS_TESTNET_RPC_URL}`,
      ...accounts,
    },
    "polygon-mainnet": {
      type: "http",
      chainId: 137,
      url: `${POLYGON_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "polygon-amoy": {
      type: "http",
      chainId: 80002,
      url: `${POLYGON_AMOY_RPC_URL}`,
      ...accounts,
    },
    "ethereum-mainnet": {
      type: "http",
      chainId: 1,
      url: `${ETHEREUM_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "ethereum-sepolia": {
      type: "http",
      chainId: 11155111,
      url: `${ETHEREUM_SEPOLIA_RPC_URL}`,
      ...accounts,
    },
    "zkevm-mainnet": {
      type: "http",
      chainId: 1101,
      url: `${ZKEVM_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "zkevm-cardona": {
      type: "http",
      chainId: 2442,
      url: `${ZKEVM_CARDONA_RPC_URL}`,
      ...accounts,
    },
    "linea-mainnet": {
      type: "http",
      chainId: 59144,
      url: `${LINEA_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "linea-sepolia": {
      type: "http",
      chainId: 59141,
      url: `${LINEA_SEPOLIA_RPC_URL}`,
      ...accounts,
    },
    "base-mainnet": {
      type: "http",
      chainId: 8453,
      url: `${BASE_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "base-sepolia": {
      type: "http",
      chainId: 84532,
      url: `${BASE_SEPOLIA_RPC_URL}`,
      ...accounts,
    },
    "bnb-mainnet": {
      type: "http",
      chainId: 56,
      url: `${BNB_MAINNET_RPC_URL}`,
      ...accounts,
    },
    "bnb-testnet": {
      type: "http",
      chainId: 97,
      url: `${BNB_TESTNET_RPC_URL}`,
      ...accounts,
    },
    // --------------------------------------------------------------------------------------------------------------
    // Note: uncomment to use a forked network and then run `npx hardhat node --fork`
    // in some networks is needed to execute first a script with `await ethers.provider.send("evm_mine")`
    // to mine a block. Otherwise you can receive an error: "No known hardfork for execution on historical block..."
    // --------------------------------------------------------------------------------------------------------------
    // fork: {
    //   chainId: 80002,
    //   type: "edr-simulated",
    //   forking: {
    //     url: `${POLYGON_AMOY_RPC_URL}`,
    //   },
    //   accounts: [
    //     {
    //       privateKey: PRIVATE_KEY as string,
    //       balance: "1000000000000000000000000",
    //     },
    //   ],
    // },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
      timeout: 100000000,
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
      apiKey: ETHERSCAN_API_KEY,
    },
  },
  chainDescriptors: {
    6913: {
      name: "billions-testnet",
      blockExplorers: {
        blockscout: {
          name: "billions-testnet",
          url: "https://explorer-testnet.billions.network",
          apiUrl: "https://explorer-testnet.billions.network/api/",
        },
      },
    },
    45056: {
      name: "billions-mainnet",
      blockExplorers: {
        blockscout: {
          name: "billions-mainnet",
          url: "https://explorer.billions.network",
          apiUrl: "https://explorer.billions.network/api/",
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
