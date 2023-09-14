import { Contract } from "ethers";
import { ethers } from "hardhat";

type Grow<T, A extends Array<T>> = ((x: T, ...xs: A) => void) extends (...a: infer X) => void
  ? X
  : never;

type GrowToSize<T, A extends Array<T>, N extends number> = {
  0: A;
  1: GrowToSize<T, Grow<T, A>, N>;
}[A["length"] extends N ? 0 : 1];

export type FixedArray<T, N extends number> = GrowToSize<T, [], N>;

export type MtpProof = {
  root: number | string;
  existence: boolean;
  siblings: FixedArray<string, 64>;
  index: number | string;
  value: number | string;
  auxExistence: boolean;
  auxIndex: number | string;
  auxValue: number | string;
};

export function genMaxBinaryNumber(digits: number): bigint {
  return BigInt(2) ** BigInt(digits) - BigInt(1);
}

export async function addLeaf(smt: Contract, i: number, v: number) {
  const { blockNumber } = await smt.add(i, v);
  const root = await smt.getRoot();
  const rootInfo = await smt.getRootInfo(root);
  const { timestamp } = await ethers.provider.getBlock(blockNumber);
  return { timestamp, blockNumber, root, rootInfo };
}

export async function addStateToStateLib(
  stateLibWrapper: Contract,
  id: string | number,
  state: string | number,
  noTimeAndBlock = false
) {
  const { blockNumber } = noTimeAndBlock
    ? await stateLibWrapper.addGenesisState(id, state)
    : await stateLibWrapper.addState(id, state);
  const { timestamp } = await ethers.provider.getBlock(blockNumber);

  const stateInfoById = await stateLibWrapper.getStateInfoById(id);
  const stateInfoByIdAndState = await stateLibWrapper.getStateInfoByIdAndState(id, state);

  return {
    timestamp,
    blockNumber,
    stateInfoById,
    stateInfoByIdAndState,
  };
}

export async function publishState(
  state: Contract,
  json: { [key: string]: string }
): Promise<{
  oldState: string;
  newState: string;
  id: string;
  blockNumber: number;
  timestamp: number;
}> {
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

  const { blockNumber } = await transitStateTx.wait();
  const { timestamp } = await ethers.provider.getBlock(transitStateTx.blockNumber);

  return {
    oldState,
    newState,
    id,
    blockNumber,
    timestamp,
  };
}

export async function publishStateWithStubProof(
  state: Contract,
  params: {
    id: string | number | bigint;
    oldState: string | number | bigint;
    newState: string | number | bigint;
    isOldStateGenesis: boolean;
  }
): Promise<{
  id: string | number | bigint;
  oldState: string | number | bigint;
  newState: string | number | bigint;
  blockNumber: number;
  timestamp: number;
}> {
  const transitStateTx = await state.transitState(
    params.id,
    params.oldState,
    params.newState,
    params.isOldStateGenesis,
    ["0", "0"],
    [
      ["0", "0"],
      ["0", "0"],
    ],
    ["0", "0"]
  );

  const { blockNumber } = await transitStateTx.wait();
  const { timestamp } = await ethers.provider.getBlock(transitStateTx.blockNumber);

  return {
    id: params.id,
    oldState: params.oldState,
    newState: params.newState,
    blockNumber,
    timestamp,
  };
}

export function toJson(data) {
  return JSON.stringify(data, (_, v) => (typeof v === "bigint" ? `${v}n` : v)).replace(
    /"(-?\d+)n"/g,
    (_, a) => a
  );
}
export function prepareInputs(json: any): any {
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
export interface VerificationInfo {
  inputs: Array<string>;
  pi_a: Array<string>;
  pi_b: Array<Array<string>>;
  pi_c: Array<string>;
}
