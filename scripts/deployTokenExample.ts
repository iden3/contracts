
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
const pathOutputJson = path.join(__dirname, "./deploy_token_output.json");

async function main() {

    const ExampleZKPToken = await ethers.getContractFactory("ExampleZKPToken");
    const erc20zkpToken = await ExampleZKPToken.deploy("0x6522C1d0d9b522b797dDA1E4C849B12f08e9c15d"); // current mtp validator address on mumbai

    await erc20zkpToken.deployed();
    console.log("ERC20ZKPToken deployed to:", erc20zkpToken.address);


    const outputJson = {
        token: erc20zkpToken.address,
        network: process.env.HARDHAT_NETWORK
    };
    fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
