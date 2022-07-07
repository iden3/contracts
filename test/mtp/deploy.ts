import { ethers, upgrades } from "hardhat";

export async function deployContracts(): Promise<{
  state: any;
  mtp: any;
  exampleToken?: any;
}> {
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();

  await verifier.deployed();
  console.log("Verifier deployed to:", verifier.address);

  const VerifierMTP = await ethers.getContractFactory("VerifierMTP");
  const verifierMTP = await VerifierMTP.deploy();

  await verifierMTP.deployed();
  console.log("VerifierMTP deployed to:", verifierMTP.address);

  const State = await ethers.getContractFactory("State");
  const state = await upgrades.deployProxy(State, [verifier.address]);

  await state.deployed();

  console.log("State deployed to:", state.address);

  const CredentialAtomicQueryMTP = await ethers.getContractFactory(
    "CredentialAtomicQueryMTP"
  );

  const credentialAtomicQueryMTP = await upgrades.deployProxy(
    CredentialAtomicQueryMTP,
    [verifierMTP.address, state.address]
  );

  await credentialAtomicQueryMTP.deployed();
  console.log(
    "CredentialAtomicQueryMTP deployed to:",
    credentialAtomicQueryMTP.address
  );

  return {
    mtp: credentialAtomicQueryMTP,
    state: state,
  };
}

export async function deployToken(mtpValidatorAddress: string): Promise<{
  address: string;
}> {
  const GenesisUtils = await ethers.getContractFactory("GenesisUtils");
  const genesisUtils = await GenesisUtils.deploy();

  await genesisUtils.deployed();
  console.log("GenesisUtils deployed to:", genesisUtils.address);

  const ExampleToken = await ethers.getContractFactory("ExampleToken", {
    libraries: {
      GenesisUtils: genesisUtils.address,
    },
  });
  const exampleToken = await ExampleToken.deploy(mtpValidatorAddress);

  await exampleToken.deployed();
  console.log("ExampleToken deployed to:", exampleToken.address);

  return exampleToken;
}
