require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");

DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";

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
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.15"
            },
            {
                version: "0.8.2"
            },
            {
                version: "0.6.11"
            },
        ]
    },
    networks: {
        // ropsten: {
        //     chainId: 3,
        //     url: "https://ropsten.infura.io/v3/{infuraID}",
        //     accounts: [<private key here>],
        // },
        // mumbai: {
        //     chainId: 80001,
        //     url: "url here",
        //     accounts: ["private key here"],
        // },
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
    // etherscan: {
    //     apiKey: "etherscan API key"
    // }
    gasReporter: {
        currency: "USD",
        coinmarketcap: process.env.COINMARKETCAP_KEY,
        enabled: !!process.env.REPORT_GAS,
        token: "MATIC",
    },
};
