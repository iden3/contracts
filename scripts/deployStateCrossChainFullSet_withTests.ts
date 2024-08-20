import { ethers } from "hardhat";
import hre from "hardhat";
import { packV3ValidatorParams, packValidatorParams } from "../test/utils/validator-pack-utils";
import { DeployHelper } from "../helpers/DeployHelper";
import { calculateQueryHashV2, calculateQueryHashV3 } from "../test/utils/query-hash-utils";
import {
  buildDIDType,
  genesisFromEthAddress,
  Id,
  Blockchain,
  DidMethod,
  NetworkId,
  SchemaHash,
  DID,
} from "@iden3/js-iden3-core";
import { Hex } from "@iden3/js-crypto";
import { Merklizer } from "@iden3/js-jsonld-merklization";

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);

  const chainId = hre.network.config.chainId;
  const network = hre.network.name;
  // ##################### StateCrossChain deploy #####################

  const oracleProofValidator = await deployHelper.deployOracleProofValidator();
  const { state } = await deployHelper.deployState();

  // ##################### Validator deploy #####################

  const { validator: validatorMTP } = await deployHelper.deployValidatorContracts(
    "VerifierMTPWrapper",
    "CredentialAtomicQueryMTPV2Validator",
    await state.getAddress(),
    await oracleProofValidator.getAddress(),
  );

  const { validator: validatorSig } = await deployHelper.deployValidatorContracts(
    "VerifierSigWrapper",
    "CredentialAtomicQuerySigV2Validator",
    await state.getAddress(),
    await oracleProofValidator.getAddress(),
  );

  const { validator: validatorV3 } = await deployHelper.deployValidatorContracts(
    "VerifierV3Wrapper",
    "CredentialAtomicQueryV3Validator",
    await state.getAddress(),
    await oracleProofValidator.getAddress(),
  );

  // // ##################### Verifier deploy #####################

  const verifier = await deployHelper.deployUniversalVerifier(undefined);

  const addToWhiteList1 = await verifier.addValidatorToWhitelist(await validatorSig.getAddress());
  await addToWhiteList1.wait();
  const addToWhiteList2 = await verifier.addValidatorToWhitelist(await validatorMTP.getAddress());
  await addToWhiteList2.wait();
  const addToWhiteList3 = await verifier.addValidatorToWhitelist(await validatorV3.getAddress());
  await addToWhiteList3.wait();

  // ##################### SetZKPRequest #####################

  const Operators = {
    NOOP: 0, // No operation, skip query verification in circuit
    EQ: 1, // equal
    LT: 2, // less than
    GT: 3, // greater than
    IN: 4, // in
    NIN: 5, // not in
    NE: 6, // not equal
    SD: 16, // selective disclosure
  };

  console.log(
    "================= setZKPRequest V3 SIG Transak `email-verified` $eq true ===================",
  );

  const schemaHashIndividualKYC = "83588135147751541079133521251473709708";
  const coreSchemaIndividualKYC = coreSchemaFromStr(schemaHashIndividualKYC);

  const verifierId = buildVerifierId(await verifier.getAddress(), {
    blockchain: Blockchain.Polygon,
    networkId: NetworkId.Amoy,
    method: DidMethod.Iden3,
  });

  console.log(DID.parseFromId(verifierId).string());

  // merklized path to field in the W3C credential according to JSONLD  schema e.g. birthday in the KYCAgeCredential under the url "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld"
  const schemaClaimPathKeyEmailVerified =
    "6690925644799482311359070256240649323225600882434741819138192893258972267385";

  const requestIdEmailVerified = 1;

  const queryV3EmailVerified = {
    requestId: requestIdEmailVerified,
    schema: schemaHashIndividualKYC,
    claimPathKey: schemaClaimPathKeyEmailVerified,
    operator: Operators.EQ,
    value: [await Merklizer.hashValue("http://www.w3.org/2001/XMLSchema#boolean", true)],
    slotIndex: 0,
    queryHash: "",
    circuitIds: ["credentialAtomicQueryV3OnChain-beta.1"],
    allowedIssuers: [],
    skipClaimRevocationCheck: false,
    verifierID: verifierId.bigInt(),
    nullifierSessionID: 8372131,
    groupID: 0,
    proofType: 0,
  };

  queryV3EmailVerified.queryHash = calculateQueryHashV3(
    queryV3EmailVerified.value.map((i) => BigInt(i)),
    coreSchemaIndividualKYC.bigInt().toString(),
    queryV3EmailVerified.slotIndex,
    queryV3EmailVerified.operator,
    queryV3EmailVerified.claimPathKey,
    queryV3EmailVerified.value.length,
    1, // merklized
    queryV3EmailVerified.skipClaimRevocationCheck ? 0 : 1,
    queryV3EmailVerified.verifierID.toString(),
    queryV3EmailVerified.nullifierSessionID,
  ).toString();

  const dataV3EmailVerified = packV3ValidatorParams(queryV3EmailVerified);

  const invokeRequestMetadataEmailVerified = {
    id: "7f38a193-0918-4a48-9fac-36adfdb8b542",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
    thid: "7f38a193-0918-4a48-9fac-36adfdb8b542",
    from: DID.parseFromId(verifierId).string(),
    body: {
      reason: "for testing submitZKPResponseV2",
      transaction_data: {
        contract_address: verifier.address,
        method_id: "b68967e2",
        chain_id: chainId,
        network: network,
      },
      scope: [
        {
          id: queryV3EmailVerified.requestId,
          circuitId: queryV3EmailVerified.circuitIds[0],
          query: {
            allowedIssuers: !queryV3EmailVerified.allowedIssuers.length
              ? ["*"]
              : queryV3EmailVerified.allowedIssuers,
            context: "ipfs://Qmdhuf9fhqzweDa1TgoajDEj7Te7p28eeeZVfiioAjUC15",
            credentialSubject: {
              "email-verified": {
                $eq: true,
              },
            },
            type: "IndividualKYC",
          },
        },
      ],
    },
  };

  await verifier.setZKPRequest(requestIdEmailVerified, {
    metadata: JSON.stringify(invokeRequestMetadataEmailVerified),
    validator: validatorV3,
    data: dataV3EmailVerified,
  });

  console.log(`Request ID: ${requestIdEmailVerified} is set`);

  console.log("================= setZKPRequest V3 SIG Transak `email` SD ===================");

  // merklized path to field in the W3C credential according to JSONLD  schema e.g. birthday in the KYCAgeCredential under the url "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld"
  const schemaClaimPathKeyEmail =
    "45494603366705166835171894278075990839428579528180465081820758291950364182";

  const requestIdEmail = 11;

  const queryV3EmailSD = {
    requestId: requestIdEmail,
    schema: schemaHashIndividualKYC,
    claimPathKey: schemaClaimPathKeyEmail,
    operator: Operators.SD,
    value: [],
    slotIndex: 0,
    queryHash: "",
    circuitIds: ["credentialAtomicQueryV3OnChain-beta.1"],
    allowedIssuers: [],
    skipClaimRevocationCheck: false,
    verifierID: verifierId.bigInt(),
    nullifierSessionID: 11837213,
    groupID: 0,
    proofType: 0,
  };

  queryV3EmailSD.queryHash = calculateQueryHashV3(
    queryV3EmailSD.value.map((i) => BigInt(i)),
    coreSchemaIndividualKYC.bigInt().toString(),
    queryV3EmailSD.slotIndex,
    queryV3EmailSD.operator,
    queryV3EmailSD.claimPathKey,
    queryV3EmailSD.value.length,
    1, // merklized
    queryV3EmailSD.skipClaimRevocationCheck ? 0 : 1,
    queryV3EmailSD.verifierID.toString(),
    queryV3EmailSD.nullifierSessionID,
  ).toString();

  const dataV3EmailSD = packV3ValidatorParams(queryV3EmailSD);

  const invokeRequestMetadataEmailSd = {
    id: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
    thid: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    from: DID.parseFromId(verifierId).string(),
    body: {
      reason: "for testing submitZKPResponseV2",
      transaction_data: {
        contract_address: verifier.address,
        method_id: "b68967e2",
        chain_id: chainId,
        network: network,
      },
      scope: [
        {
          id: queryV3EmailSD.requestId,
          circuitId: queryV3EmailSD.circuitIds[0],
          query: {
            allowedIssuers: !queryV3EmailSD.allowedIssuers.length
              ? ["*"]
              : queryV3EmailSD.allowedIssuers,
            context: "ipfs://Qmdhuf9fhqzweDa1TgoajDEj7Te7p28eeeZVfiioAjUC15",
            credentialSubject: {
              email: {},
            },
            type: "IndividualKYC",
          },
        },
      ],
    },
  };

  await verifier.setZKPRequest(requestIdEmail, {
    metadata: JSON.stringify(invokeRequestMetadataEmailSd),
    validator: validatorV3,
    data: dataV3EmailSD,
  });

  console.log(`Request ID: ${requestIdEmail} is set`);

  console.log("================= setZKPRequest SIG V2 ===================");

  // you can run https://go.dev/play/p/oB_oOW7kBEw to get schema hash and claimPathKey using YOUR schema
  const schemaBigInt = "74977327600848231385663280181476307657";

  // merklized path to field in the W3C credential according to JSONLD  schema e.g. birthday in the KYCAgeCredential under the url "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld"
  const schemaClaimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";

  const requestId_Sig = 4;

  const query: any = {
    requestId: requestId_Sig,
    schema: schemaBigInt,
    claimPathKey: schemaClaimPathKey,
    operator: Operators.LT,
    slotIndex: 0,
    value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
    circuitIds: ["credentialAtomicQuerySigV2OnChain"],
    skipClaimRevocationCheck: false,
    claimPathNotExists: 0,
  };

  query.queryHash = calculateQueryHashV2(
    query.value,
    query.schema,
    query.slotIndex,
    query.operator,
    query.claimPathKey,
    query.claimPathNotExists,
  ).toString();

  let data = packValidatorParams(query);
  await verifier.setZKPRequest(
    requestId_Sig,
    {
      metadata: "metadata",
      validator: validatorSig,
      data: data,
    },
    // {
    //   gasPrice: 50000000000,
    //   initialBaseFeePerGas: 25000000000,
    //   gasLimit: 10000000
    // }
  );

  console.log(`Request ID: ${requestId_Sig} is set`);

  console.log("================= setZKPRequest MTP V2 ===================");

  query.circuitIds = ["credentialAtomicQueryMTPV2OnChain"];
  data = packValidatorParams(query);
  const requestId_Mtp = 2;

  await verifier.setZKPRequest(
    requestId_Mtp,
    {
      metadata: "metadata",
      validator: validatorMTP,
      data: data,
    },
    // {
    //   gasPrice: 50000000000,
    //   initialBaseFeePerGas: 25000000000,
    //   gasLimit: 10000000
    // }
  );

  console.log(`Request ID: ${requestId_Mtp} is set`);

  // ##################### Test Verifier #####################
  //
  // const validator = validatorSig;
  //
  // const tenYears = 60 * 60 * 24 * 365 * 10;
  // await validator.setGISTRootExpirationTimeout(tenYears); // 1 year
  // await validator.setProofExpirationTimeout(tenYears); // 1 year
  //
  // const tx = await verifier.submitZKPResponseV2([
  //   {
  //     requestId: requestId_Sig,
  //     zkProof:
  //       "0x00000000000000000000000000000000000000000000000000000000000001200c44028cb50c482b459e23838a4aa90afd8eff9e6a9984879ec7fab82cd706a71cb01c95afc3fc89f8dc067b43c9343798ba095e6bced0d933b658e5101cb0cd1fcc86d9926fe3c36a76d4358b52e17feeabcb9b92fa744f3f0194c289af9005025e392a604a1d7e300d6515b40fb44bb8c65f08a4b76506b330067b4179d0d6169b975d16c685de161f33681e831134176f84b959c3ef4649544c8cba48aeb213b6e4d9ed8bf185ef2400f1ff0ce60b5dd60a2bce3aa7bbf4e1ed3d887ba73d19a8db4f62ba5477c41e758315db7fa96285a060d136d171999bcd860a3e83aa1288c06f0dbc930d5a10e876853e390c0672a16d566d72ad1a0f6c27f497ae5a000000000000000000000000000000000000000000000000000000000000000b0000000000000000000000000000000000000000000000000000000000000001000e54027f41a1961526b608019ce250b2cd7afae0e6f2fdf2439b314404a1012143527826f525f196d17fd8eaf64ef1818c6ab5c4f8c054161053c1afb7cc8f25dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea38333937b00000000000000000000000000000000000000000000000000000000000000040000000000000000000000004df9fe847b25bd454cb15306fa1efed2f74349e40000000000000000000000000000000000000000000000000000000000000000000d8025dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea201000000000000000000000000000000000000000000000000000000000000000125dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea38333937b0000000000000000000000000000000000000000000000000000000066bb4760",
  //     crossChainProof:
  //       "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000004c0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000010676c6f62616c537461746550726f6f660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000066bb4766000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000041a27b6cbcf78d3618ad68b1eb86ad5517c60778651799174a28bb1eed644df2407e2f2c433c41ea5c6a2f7ebb82c0f45b18caf4845469bfdf2e9bfb36dac44c5b1c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000a737461746550726f6f660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000066bb4764000d8025dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea20125dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea38333937b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000004117a1c3e8d2c53e2e723d03d2fa74f626955ebb4715305a077c805327b5ecf74155c41d2c969ed419ef81cdff64a409622cb3caf204781c677791a51e2adfb69b1b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000a737461746550726f6f660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000066bb4765000d8025dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea20125dd092801bbc04b50b3dd4f16134ae8f97aabbdc07dd4740e2dbea38333937b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000041476073c3e9568e7ea006d4c2547224fc45204a87ef92b3df49702c8f1462b91a1dae3ca145fcb92df36875f2b78d5d6874b987d444a02a545ff4aba7f1b742b61b00000000000000000000000000000000000000000000000000000000000000",
  //     data: "0x",
  //   },
  // ]);
  //
  // await tx.wait();
  //
  // console.log(`ZKPResponse submitted. Tx hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export function buildVerifierId(
  address: string,
  info: { method: string; blockchain: string; networkId: string },
): Id {
  address = address.replace("0x", "");
  const ethAddrBytes = Hex.decodeString(address);
  const ethAddr = ethAddrBytes.slice(0, 20);
  const genesis = genesisFromEthAddress(ethAddr);

  const tp = buildDIDType(info.method, info.blockchain, info.networkId);

  return new Id(tp, genesis);
}

export const coreSchemaFromStr = (schemaIntString: string) => {
  const schemaInt = BigInt(schemaIntString);
  return SchemaHash.newSchemaHashFromInt(schemaInt);
};
