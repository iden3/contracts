import { ethers, upgrades } from "hardhat";

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

export async function deployContracts(): Promise<{
  state: any;
  mtp: any;
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
