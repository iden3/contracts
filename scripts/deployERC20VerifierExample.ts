
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
import {expect} from "chai";
const pathOutputJson = path.join(__dirname, "./deploy_erc20verifier_output.json");

async function main() {

    const ERC20Verifier = await ethers.getContractFactory("ERC20Verifier");
    const erc20Verifer = await ERC20Verifier.deploy("ERC20ZKPVerifer","ERCZKP"); // current mtp validator address on mumbai

    await erc20Verifer.deployed();
    console.log("ERC20Verifier deployed to:", erc20Verifer.address);

    // set default query

    const ageQuery = {schema:ethers.BigNumber.from("210459579859058135404770043788028292398"), slotIndex: 2, operator: 2, value: [20020101], circuitId : "credentialAmoticQueryMTP"};

    const requestId = await  erc20Verifer.TRANSFER_REQUEST_ID();
    try {
       let tx =   await erc20Verifer.setZKPRequest(requestId,"0x6522C1d0d9b522b797dDA1E4C849B12f08e9c15d",ageQuery);
       console.log(tx.hash);
    }catch (e) {
        console.log("error: ", e)
    }

    const outputJson = {
        token: erc20Verifer.address,
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
