
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
const pathOutputJson = path.join(__dirname, "./deploy_validator_output.json");

async function main() {

    const VerifierMTPWrapper = await ethers.getContractFactory("VerifierMTPWrapper");
    const verifierMTP = await VerifierMTPWrapper.deploy();

    await verifierMTP.deployed();
    console.log("VerifierMTPWrapper deployed to:", verifierMTP.address);

    const CredentialAtomicQueryMTPValidator = await ethers.getContractFactory(
        "CredentialAtomicQueryMTPValidator"
    );

    const CredentialAtomicQueryMTPValidatorProxy = await upgrades.deployProxy(
        CredentialAtomicQueryMTPValidator,
        [verifierMTP.address, "0x46Fd04eEa588a3EA7e9F055dd691C688c4148ab3"] // current state address on mumbai
    );

    await CredentialAtomicQueryMTPValidatorProxy.deployed();
    console.log(
        "CredentialAtomicQueryMTPValidator deployed to:",
        CredentialAtomicQueryMTPValidatorProxy.address
    );

    const outputJson = {
        validatorMTP: CredentialAtomicQueryMTPValidatorProxy.address,
        verifierMTP: verifierMTP.address,
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
