import { ethers } from "ethers";

const abiCoder = new ethers.AbiCoder();

export function packValidatorParams(query: any, allowedIssuers: any[] = []): string {
  return abiCoder.encode(
    [
      "tuple(" +
        "uint256 schema," +
        "uint256 claimPathKey," +
        "uint256 operator," +
        "uint256 slotIndex," +
        "uint256[] value," +
        "uint256 queryHash," +
        "uint256[] allowedIssuers," +
        "string[] circuitIds," +
        "bool skipClaimRevocationCheck," +
        "uint256 claimPathNotExists" +
        ")",
    ],
    [
      {
        schema: query.schema,
        claimPathKey: query.claimPathKey,
        operator: query.operator,
        slotIndex: query.slotIndex,
        value: query.value,
        queryHash: query.queryHash,
        allowedIssuers: allowedIssuers,
        circuitIds: query.circuitIds,
        skipClaimRevocationCheck: query.skipClaimRevocationCheck,
        claimPathNotExists: query.claimPathNotExists,
      },
    ]
  );
}

export function packV3ValidatorParams(query: any, allowedIssuers: any[] = []): string {
  return abiCoder.encode(
    [
      "tuple(" +
        "uint256 schema," +
        "uint256 claimPathKey," +
        "uint256 operator," +
        "uint256 slotIndex," +
        "uint256[] value," +
        "uint256 queryHash," +
        "uint256[] allowedIssuers," +
        "string[] circuitIds," +
        "bool skipClaimRevocationCheck," +
        "uint256 groupID," +
        "uint256 nullifierSessionID," +
        "uint256 proofType," +
        "uint256 verifierID" +
        ")",
    ],
    [
      {
        schema: query.schema,
        claimPathKey: query.claimPathKey,
        operator: query.operator,
        slotIndex: query.slotIndex,
        value: query.value,
        queryHash: query.queryHash,
        allowedIssuers: allowedIssuers,
        circuitIds: query.circuitIds,
        skipClaimRevocationCheck: query.skipClaimRevocationCheck,
        groupID: query.groupID,
        nullifierSessionID: query.nullifierSessionID,
        proofType: query.proofType,
        verifierID: query.verifierID,
      },
    ]
  );
}
