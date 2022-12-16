type Grow<T, A extends Array<T>> = ((x: T, ...xs: A) => void) extends (
  ...a: infer X
) => void
  ? X
  : never;

type GrowToSize<T, A extends Array<T>, N extends number> = {
  0: A;
  1: GrowToSize<T, Grow<T, A>, N>;
}[A["length"] extends N ? 0 : 1];

export type FixedArray<T, N extends number> = GrowToSize<T, [], N>;

export type MtpProof = {
  root: string;
  existence: boolean;
  siblings: FixedArray<string, 32>;
  index: number | string;
  value: number;
  auxExistence: boolean;
  auxIndex: number | string;
  auxValue: number;
};

export function genMaxBinaryNumber(digits: number): number {
  return 2 ** digits - 1;
}
