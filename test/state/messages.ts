export interface IdentityStateMessage {
  from: string;
  timestamp: bigint;
  identity: bigint;
  state: bigint;
  replacedByState: bigint;
  createdAtTimestamp: bigint;
  replacedAtTimestamp: bigint;
}

export interface GlobalStateMessage {
  from: string;
  timestamp: bigint;
  root: bigint;
  replacedByRoot: bigint;
  createdAtTimestamp: bigint;
  replacedAtTimestamp: bigint;
}
