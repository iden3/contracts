import { ethers, upgrades } from "hardhat";
import { poseidonContract as poseidonGenContract } from "circomlibjs";

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

export async function deployERC20ZKPVerifierToken(
  name: string,
  symbol: string,
  contractName = "ERC20Verifier"
): Promise<{
  address: string;
}> {
  const ERC20Verifier = await ethers.getContractFactory(contractName);
  const erc20Verifier = await ERC20Verifier.deploy(name, symbol);

  await erc20Verifier.deployed();
  console.log(contractName, " deployed to:", erc20Verifier.address);

  return erc20Verifier;
}

export interface VerificationInfo {
  inputs: Array<string>;
  pi_a: Array<string>;
  pi_b: Array<Array<string>>;
  pi_c: Array<string>;
}

export function prepareInputs(json: any): VerificationInfo {
  const { proof, pub_signals } = json;
  const { pi_a, pi_b, pi_c } = proof;
  const [[p1, p2], [p3, p4]] = pi_b;
  const preparedProof = {
    pi_a: pi_a.slice(0, 2),
    pi_b: [
      [p2, p1],
      [p4, p3],
    ],
    pi_c: pi_c.slice(0, 2),
  };

  return { inputs: pub_signals, ...preparedProof };
}

export function toBigNumber({ inputs, pi_a, pi_b, pi_c }: VerificationInfo) {
  return {
    inputs: inputs.map((input) => ethers.BigNumber.from(input)),
    pi_a: pi_a.map((input) => ethers.BigNumber.from(input)),
    pi_b: pi_b.map((arr) => arr.map((input) => ethers.BigNumber.from(input))),
    pi_c: pi_c.map((input) => ethers.BigNumber.from(input)),
  };
}

export async function publishState(
  state: any,
  json: { [key: string]: string }
): Promise<void> {
  const {
    inputs: [id, oldState, newState, isOldStateGenesis],
    pi_a,
    pi_b,
    pi_c,
  } = prepareInputs(json);

  const transitStateTx = await state.transitState(
    id,
    oldState,
    newState,
    isOldStateGenesis === "1" ? true : false,
    pi_a,
    pi_b,
    pi_c
  );

  await transitStateTx.wait();
}

export async function deployPoseidonExt(owner: any): Promise<any> {
  const unitsContract: any[] = [];
  for (let n of [2, 6]) {
    const contract = await deployPoseidonUnit(n, owner);
    unitsContract.push(contract);
  }

  const PoseidonExtended = await ethers.getContractFactory("PoseidonExtended");

  const poseidonExtended = await PoseidonExtended.deploy(
    unitsContract[0].address,
    unitsContract[1].address
  );
  await poseidonExtended.deployed();

  console.log("PoseidonExtended deployed to", poseidonExtended.address);
  return poseidonExtended;
}

async function deployPoseidonUnit(n: number, owner: any): Promise<any> {
  const abi = poseidonGenContract.generateABI(n);
  const code = poseidonGenContract.createCode(n);
  const Poseidon2Elements = new ethers.ContractFactory(abi, code, owner);
  const poseidonFnContract = await Poseidon2Elements.deploy();
  await poseidonFnContract.deployed();
  return poseidonFnContract;
}
