export interface ClaimData {
  schemaHash: bigint;
  idPosition: number;
  expirable: boolean;
  updatable: boolean;
  merklizedRootPosition: number;
  version: number;
  id: bigint;
  revocationNonce: number;
  expirationDate: number;
  merklizedRoot: bigint;
  indexDataSlotA: bigint;
  indexDataSlotB: bigint;
  valueDataSlotA: bigint;
  valueDataSlotB: bigint;
};
