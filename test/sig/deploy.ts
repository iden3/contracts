import { ethers, upgrades } from "hardhat";

export async function deployContracts(): Promise<{
  state: any;
  sig: any;
  exampleToken?: any;
}> {
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();

  await verifier.deployed();
  console.log("Verifier deployed to:", verifier.address);

  const VerifierSignatureWrapper = await ethers.getContractFactory("VerifierSigWrapper");
  const verifierSig = await VerifierSignatureWrapper.deploy();

  await verifierSig.deployed();
  console.log("VerifierMTPWrapper deployed to:", verifierSig.address);

  const State = await ethers.getContractFactory("State");
  const state = await upgrades.deployProxy(State, [verifier.address]);

  await state.deployed();

  console.log("State deployed to:", state.address);

  const CredentialAtomicQuerySigValidator = await ethers.getContractFactory(
    "CredentialAtomicQuerySigValidator"
  );

  const credentialAtomicQuerySigValidatorProxy = await upgrades.deployProxy(
      CredentialAtomicQuerySigValidator,
    [verifierSig.address, state.address]
  );

  await credentialAtomicQuerySigValidatorProxy.deployed();
  console.log(
    "CredentialAtomicQuerySigValidator deployed to:",
      credentialAtomicQuerySigValidatorProxy.address
  );

  return {
    sig: credentialAtomicQuerySigValidatorProxy,
    state: state,
  };
}

export async function deployToken(mtpValidatorAddress: string): Promise<{
  address: string;
}> {

  const ExampleToken = await ethers.getContractFactory("ExampleToken");
  const exampleToken = await ExampleToken.deploy(mtpValidatorAddress);

  await exampleToken.deployed();
  console.log("ExampleToken deployed to:", exampleToken.address);

  return exampleToken;
}

export async function deployERC20ZKPToken(mtpValidatorAddress: string): Promise<{
  address: string;
}> {
  const ExampleZKPToken = await ethers.getContractFactory("ExampleZKPToken");
  const erc20zkpToken = await ExampleZKPToken.deploy(mtpValidatorAddress);

  await erc20zkpToken.deployed();
  console.log("ERC20ZKPToken deployed to:", erc20zkpToken.address);

  return erc20zkpToken;
}

export async function deployERC20ZKPVerifierToken(name: string, symbol: string): Promise<{
  address: string;
}> {
  const ERC20Verifier = await ethers.getContractFactory("ERC20Verifier");
  const erc20Verifier = await ERC20Verifier.deploy(name,symbol);

  await erc20Verifier.deployed();
  console.log("ERC20Verifier deployed to:", erc20Verifier.address);

  return erc20Verifier;
}
