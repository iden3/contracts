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

  const VerifierMTPWrapper = await ethers.getContractFactory("VerifierMTPWrapper");
  const verifierMTP = await VerifierMTPWrapper.deploy();

  await verifierMTP.deployed();
  console.log("VerifierMTPWrapper deployed to:", verifierMTP.address);

  const State = await ethers.getContractFactory("State");
  const state = await upgrades.deployProxy(State, [verifier.address]);

  await state.deployed();

  console.log("State deployed to:", state.address);

  const CredentialAtomicQueryMTPValidator = await ethers.getContractFactory(
    "CredentialAtomicQueryMTPValidator"
  );

  const CredentialAtomicQueryMTPValidatorProxy = await upgrades.deployProxy(
      CredentialAtomicQueryMTPValidator,
    [verifierMTP.address, state.address]
  );

  await CredentialAtomicQueryMTPValidatorProxy.deployed();
  console.log(
    "CredentialAtomicQueryMTPValidator deployed to:",
      CredentialAtomicQueryMTPValidatorProxy.address
  );

  return {
    mtp: CredentialAtomicQueryMTPValidatorProxy,
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
