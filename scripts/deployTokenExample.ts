
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
const pathOutputJson = path.join(__dirname, "./deploy_token_output.json");

async function main() {

    const ExampleZKPToken = await ethers.getContractFactory("ExampleZKPToken");
    const erc20zkpToken = await ExampleZKPToken.deploy("0x1D9C184dDe367dccaede8A69Cf8d65b28D8c338d"); // current mtp validator address on mumbai

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
