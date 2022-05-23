
async function main() {
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();

    const State = await ethers.getContractFactory("State");
    const state = await State.deploy(verifier.address);
    await state.deployed();

    console.log(`Verifier contract deployed to ${verifier.address} from ${(await ethers.getSigners())[0].address}`);
    console.log(`State contract deployed to ${state.address} from ${(await ethers.getSigners())[0].address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });