import { poseidon } from "@iden3/js-crypto";
import { SchemaHash } from "@iden3/js-iden3-core";

export function calculateQueryHashV2(
  values: bigint[],
  schema: string,
  slotIndex: string | number,
  operator: string | number,
  claimPathKey: string | number,
  claimPathNotExists: string | number,
): bigint {
  const expValue = prepareCircuitArrayValues(values, 64);
  const valueHash = poseidon.spongeHashX(expValue, 6);
  const schemaHash = coreSchemaFromStr(schema);
  return poseidon.hash([
    schemaHash.bigInt(),
    BigInt(slotIndex),
    BigInt(operator),
    BigInt(claimPathKey),
    BigInt(claimPathNotExists),
    valueHash,
  ]);
}

export function calculateQueryHashV3(
  values: bigint[],
  schema: string,
  slotIndex: string | number,
  operator: string | number,
  claimPathKey: string | number,
  valueArraySize: string | number,
  merklized: string | number,
  isRevocationChecked: string | number,
  verifierID: string | number,
  nullifierSessionID: string | number,
): bigint {
  const expValue = prepareCircuitArrayValues(values, 64);
  const valueHash = poseidon.spongeHashX(expValue, 6);
  const schemaHash = coreSchemaFromStr(schema);

  const firstPartQueryHash = poseidon.hash([
    schemaHash.bigInt(),
    BigInt(slotIndex),
    BigInt(operator),
    BigInt(claimPathKey),
    BigInt(merklized),
    valueHash,
  ]);

  const queryHash = poseidon.hash([
    firstPartQueryHash,
    BigInt(valueArraySize),
    BigInt(isRevocationChecked),
    BigInt(verifierID),
    BigInt(nullifierSessionID),
    BigInt(0n),
  ]);
  return queryHash;
}

const prepareCircuitArrayValues = (arr: bigint[], size: number): bigint[] => {
  if (!arr) {
    arr = [];
  }
  if (arr.length > size) {
    throw new Error(`array size ${arr.length} is bigger max expected size ${size}`);
  }

  // Add the empty values
  for (let i = arr.length; i < size; i++) {
    arr.push(BigInt(0));
  }

  return arr;
};

const coreSchemaFromStr = (schemaIntString: string) => {
  const schemaInt = BigInt(schemaIntString);
  return SchemaHash.newSchemaHashFromInt(schemaInt);
};
