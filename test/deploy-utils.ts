import { ethers, upgrades } from "hardhat";
import { poseidonContract } from "circomlibjs";

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

export async function deployContracts(
  deployMtp = false,
  enableLogging = false
): Promise<{
  state: any;
  mtp: any;
  smt: any;
  verifier: any;
}> {
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();
  enableLogging && console.log("Verifier deployed to:", verifier.address);
  let verifierMTP;
  if (deployMtp) {
    const VerifierMTP = await ethers.getContractFactory("VerifierMTP");
    verifierMTP = await VerifierMTP.deploy();
    await verifierMTP.deployed();
    enableLogging &&
      console.log("VerifierMTP deployed to:", verifierMTP.address);
  }

  const State = await ethers.getContractFactory("State");
  const state = await upgrades.deployProxy(State, [verifier.address]);
  await state.deployed();
  enableLogging && console.log("State deployed to:", state.address);

  const smt = await deploySmt(state.address, enableLogging);

  await state.setSmt(smt.address);

  let credentialAtomicQueryMTP;
  if (deployMtp) {
    const CredentialAtomicQueryMTP = await ethers.getContractFactory(
      "CredentialAtomicQueryMTP"
    );
    credentialAtomicQueryMTP = await upgrades.deployProxy(
      CredentialAtomicQueryMTP,
      [verifierMTP.address, state.address]
    );
    await credentialAtomicQueryMTP.deployed();
    enableLogging &&
      console.log(
        "CredentialAtomicQueryMTP deployed to:",
        credentialAtomicQueryMTP.address
      );
  }

  return {
    mtp: credentialAtomicQueryMTP,
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
    isOldStateGenesis === "1" ? true : false,
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

export async function deploySmt(
  contractAddress: string,
  enableLogging = false
): Promise<any> {
  const [owner] = await ethers.getSigners();

  const abi = poseidonContract.generateABI(2);
  const code = poseidonContract.createCode(2);
  const Poseidon2Elements = new ethers.ContractFactory(abi, code, owner);
  const poseidon2Elements = await Poseidon2Elements.deploy();
  await poseidon2Elements.deployed();
  enableLogging &&
    console.log("Poseidon3Elements deployed to:", poseidon2Elements.address);

  const abi3 = poseidonContract.generateABI(3);
  const code3 = poseidonContract.createCode(3);
  const Poseidon3Elements = new ethers.ContractFactory(abi3, code3, owner);
  const poseidon3Elements = await Poseidon3Elements.deploy();
  await poseidon3Elements.deployed();
  enableLogging &&
    console.log("Poseidon3Elements deployed to:", poseidon3Elements.address);
  const Smt = await ethers.getContractFactory("Smt");
  const smt = await upgrades.deployProxy(Smt, [
    poseidon2Elements.address,
    poseidon3Elements.address,
    contractAddress,
  ]);
  await smt.deployed();
  enableLogging &&
    console.log(
      `SMT deployed to:  ${smt.address} with writer address ${contractAddress}`
    );
  return smt;
}
