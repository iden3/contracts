import { ethers, upgrades } from "hardhat";
import { poseidonContract } from "circomlibjs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

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

export async function deployContracts(enableLogging = false): Promise<{
  state: any;
  smt: any;
  verifier: any;
}> {
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();
  enableLogging && console.log("Verifier deployed to:", verifier.address);

  const State = await ethers.getContractFactory("StateV2");
  const state = await upgrades.deployProxy(State, [verifier.address]);
  await state.deployed();
  enableLogging && console.log("State deployed to:", state.address);

  const [owner] = await ethers.getSigners();

  const { poseidon2Elements, poseidon3Elements } = await deployPoseidons(
    owner,
    enableLogging
  );

  const smt = await deploySmt(
    state.address,
    poseidon2Elements.address,
    poseidon3Elements.address,
    enableLogging
  );

  await state.setSmt(smt.address);
  // Enable state transition
  await state.setTransitionStateEnabled(true);

  return {
    state,
    smt,
    verifier,
  };
}

export async function publishState(
  state: any,
  json: { [key: string]: string }
): Promise<{ oldState: string; newState: string; id: string }> {
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
    isOldStateGenesis === "1",
    pi_a,
    pi_b,
    pi_c
  );

  await transitStateTx.wait();

  return {
    oldState,
    newState,
    id,
  };
}

export async function deployMtp(
  stateAddress: string,
  enableLogging = false
): Promise<{ mtp: any; verifierMTP: any }> {
  const VerifierMTP = await ethers.getContractFactory("VerifierMTP");
  const verifierMTP = await VerifierMTP.deploy();
  await verifierMTP.deployed();
  enableLogging && console.log("VerifierMTP deployed to:", verifierMTP.address);

  const CredentialAtomicQueryMTP = await ethers.getContractFactory(
    "CredentialAtomicQueryMTP"
  );
  const mtp = await upgrades.deployProxy(CredentialAtomicQueryMTP, [
    verifierMTP.address,
    stateAddress,
  ]);
  await mtp.deployed();
  enableLogging &&
    console.log("CredentialAtomicQueryMTP deployed to:", mtp.address);

  return { mtp, verifierMTP };
}

export async function deploySmt(
  writerAddress: string,
  poseidon2Address: string,
  poseidon3Address: string,
  enableLogging = false
): Promise<any> {
  const Smt = await ethers.getContractFactory("Smt");
  const smt = await upgrades.deployProxy(Smt, [
    poseidon2Address,
    poseidon3Address,
    writerAddress,
  ]);
  await smt.deployed();
  enableLogging &&
    console.log(
      `SMT deployed to:  ${smt.address} with writer address ${writerAddress}`
    );

  return smt;
}

export async function deployPoseidons(
  deployer: SignerWithAddress,
  enableLogging = false
): Promise<{
  poseidon2Elements: Contract;
  poseidon3Elements: Contract;
}> {
  const abi2 = poseidonContract.generateABI(2);
  const code2 = poseidonContract.createCode(2);
  const Poseidon2Elements = new ethers.ContractFactory(abi2, code2, deployer);
  const poseidon2Elements = await Poseidon2Elements.deploy();
  await poseidon2Elements.deployed();
  enableLogging &&
    console.log("Poseidon3Elements deployed to:", poseidon2Elements.address);

  const abi3 = poseidonContract.generateABI(3);
  const code3 = poseidonContract.createCode(3);
  const Poseidon3Elements = new ethers.ContractFactory(abi3, code3, deployer);
  const poseidon3Elements = await Poseidon3Elements.deploy();
  await poseidon3Elements.deployed();
  enableLogging &&
    console.log("Poseidon3Elements deployed to:", poseidon3Elements.address);

  return {
    poseidon2Elements,
    poseidon3Elements,
  };
}

export function toJson(data) {
  return JSON.stringify(data, (_, v) =>
    typeof v === "bigint" ? `${v}n` : v
  ).replace(/"(-?\d+)n"/g, (_, a) => a);
}
