import { ethers, upgrades } from "hardhat";

export async function deployValidatorContracts(
  verifierContractWrapperName: string,
  validatorContractName: string
): Promise<{
  state: any;
  validator: any;
}> {
  const StateVerifier = await ethers.getContractFactory("Verifier");
  const stateVerifier = await StateVerifier.deploy();

  await stateVerifier.deployed();
  console.log("State Verifier deployed to:", stateVerifier.address);

  const ValidatorContractVerifierWrapper = await ethers.getContractFactory(
    verifierContractWrapperName
  );
  const validatorContractVerifierWrapper =
    await ValidatorContractVerifierWrapper.deploy();

  await validatorContractVerifierWrapper.deployed();
  console.log(
    "Validator Verifier Wrapper deployed to:",
    validatorContractVerifierWrapper.address
  );

  const State = await ethers.getContractFactory("State");
  const state = await upgrades.deployProxy(State, [stateVerifier.address]);

  await state.deployed();

  console.log("State deployed to:", state.address);

  const ValidatorContract = await ethers.getContractFactory(
    validatorContractName
  );

  const validatorContractProxy = await upgrades.deployProxy(ValidatorContract, [
    validatorContractVerifierWrapper.address,
    state.address,
  ]);

  await validatorContractProxy.deployed();
  console.log(
    `${validatorContractName} deployed to: ${validatorContractProxy.address}`
  );

  return {
    validator: validatorContractProxy,
    state,
  };
}

export async function deployTokenWithValidator(validatorAddress: string): Promise<{
  address: string;
}> {
  const ExampleToken = await ethers.getContractFactory("ExampleToken");
  const exampleToken = await ExampleToken.deploy(validatorAddress);

  await exampleToken.deployed();
  console.log("ExampleToken deployed to:", exampleToken.address);

  return exampleToken;
}
export async function deployERC20ZKPToken(
  validatorAddress: string
): Promise<{
  address: string;
}> {
  const ExampleZKPToken = await ethers.getContractFactory("ExampleZKPToken");
  const erc20zkpToken = await ExampleZKPToken.deploy(validatorAddress);

  await erc20zkpToken.deployed();
  console.log("ERC20ZKPToken deployed to:", erc20zkpToken.address);

  return erc20zkpToken;
}

export async function deployERC20ZKPVerifierToken(
  name: string,
  symbol: string
): Promise<{
  address: string;
}> {
  const ERC20Verifier = await ethers.getContractFactory("ERC20Verifier");
  const erc20Verifier = await ERC20Verifier.deploy(name, symbol);

  await erc20Verifier.deployed();
  console.log("ERC20Verifier deployed to:", erc20Verifier.address);

  return erc20Verifier;
}
