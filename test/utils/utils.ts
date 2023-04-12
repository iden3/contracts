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
