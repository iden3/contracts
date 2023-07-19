import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";

const DEFAULT_MNEMONIC =
  "test test test test test test test test test test test junk";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
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
        version: "0.8.16",
      },
    ],
  },
  networks: {
    // ropsten: {
    //     chainId: 3,
    //     url: "https://ropsten.infura.io/v3/{infuraID}",
    //     accounts: [<private key here>],
    // },
    mumbai: {
        chainId: 80001,
        url: "https://polygon-mumbai.g.alchemy.com/v2/NylY7Qhw31V8fPfstqzasLEFKcjmDJYs",
        accounts: ["794b190c537189d5b74440122ea1a91546164fc887673f8155665c334d88912d"],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: DEFAULT_MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_KEY,
    enabled: !!process.env.REPORT_GAS,
    token: "MATIC",
  },
  etherscan: {
      apiKey: "PNIT54N1A79N6KUXZSPU2SR6K4H8TCDRTD"
  }
};

export default config;
