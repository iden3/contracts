import Web3 from "web3";

export function packValidatorParams(query: any, allowedIssuers: any[] = []) {
  const web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");
  return web3.eth.abi.encodeParameter(
    {
      CredentialAtomicQuery: {
        schema: "uint256",
        claimPathKey: "uint256",
        operator: "uint256",
        slotIndex: "uint256",
        value: "uint256[]",
        queryHash: "uint256",
        allowedIssuers: "uint256[]",
        circuitIds: "string[]",
        skipClaimRevocationCheck: "bool",
        claimPathNotExists: "uint256",
      },
    },
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
    }
  );
}

export function packV3ValidatorParams(query: any, allowedIssuers: any[] = []) {
  const web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");
  return web3.eth.abi.encodeParameter(
    {
      CredentialAtomicQueryV3: {
        schema: "uint256",
        claimPathKey: "uint256",
        operator: "uint256",
        slotIndex: "uint256",
        value: "uint256[]",
        queryHash: "uint256",
        allowedIssuers: "uint256[]",
        circuitIds: "string[]",
        skipClaimRevocationCheck: "bool",
        groupID: "uint256",
        nullifierSessionID: "uint256",
        proofType: "uint256",
        verifierID: "uint256",
      },
    },
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
    }
  );
}
