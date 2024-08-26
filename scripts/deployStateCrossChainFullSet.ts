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

  const methodId = "fd41d8d4";

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
        contract_address: await verifier.getAddress(),
        method_id: methodId,
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

  console.log(JSON.stringify(invokeRequestMetadataEmailVerified, null, "\t"))

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
        contract_address: await verifier.getAddress(),
        method_id: methodId,
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

  console.log(JSON.stringify(invokeRequestMetadataEmailSd, null, "\t"))

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

  const invokeRequestMetadataKYCAgeCredential_SigV2 = {
    id: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
    thid: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    from: DID.parseFromId(verifierId).string(),
    body: {
      reason: "for testing submitZKPResponseV2",
      transaction_data: {
        contract_address: await verifier.getAddress(),
        method_id: methodId,
        chain_id: chainId,
        network: network,
      },
      scope: [
        {
          circuitId: "credentialAtomicQuerySigV2OnChain",
          id: requestId_Sig,
          query: {
            allowedIssuers: ["*"],
            context:
              "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
            credentialSubject: {
              birthday: {
                $lt: 20020101,
              },
            },
            type: "KYCAgeCredential",
          },
        },
      ],
    },
  };

  let data = packValidatorParams(query);
  await verifier.setZKPRequest(
    requestId_Sig,
    {
      metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential_SigV2),
      validator: validatorSig,
      data: data,
    },
    // {
    //   gasPrice: 50000000000,
    //   initialBaseFeePerGas: 25000000000,
    //   gasLimit: 10000000
    // }
  );
  console.log(JSON.stringify(invokeRequestMetadataKYCAgeCredential_SigV2, null, "\t"))

  console.log(`Request ID: ${requestId_Sig} is set`);

  console.log("================= setZKPRequest MTP V2 ===================");

  query.circuitIds = ["credentialAtomicQueryMTPV2OnChain"];
  data = packValidatorParams(query);
  const requestId_Mtp = 2;

  const invokeRequestMetadataKYCAgeCredential_MTPV2 = {
    id: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
    thid: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    from: DID.parseFromId(verifierId).string(),
    body: {
      reason: "for testing submitZKPResponseV2",
      transaction_data: {
        contract_address: await verifier.getAddress(),
        method_id: methodId,
        chain_id: chainId,
        network: network,
      },
      scope: [
        {
          circuitId: "credentialAtomicQuerySigV2OnChain",
          id: requestId_Mtp,
          query: {
            allowedIssuers: ["*"],
            context:
              "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
            credentialSubject: {
              birthday: {
                $lt: 20020101,
              },
            },
            type: "KYCAgeCredential",
          },
        },
      ],
    },
  };

  await verifier.setZKPRequest(
    requestId_Mtp,
    {
      metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential_MTPV2),
      validator: validatorMTP,
      data: data,
    },
    // {
    //   gasPrice: 50000000000,
    //   initialBaseFeePerGas: 25000000000,
    //   gasLimit: 10000000
    // }
  );

  console.log(JSON.stringify(invokeRequestMetadataKYCAgeCredential_MTPV2, null, "\t"));

  console.log(`Request ID: ${requestId_Mtp} is set`);

  console.log("================= setZKPRequest V3 SIG KYCAgeCredential ===================");

  const requestId_V3_KYCAgeCredential = 5;

  const queryV3KYCAgeCredential = {
    requestId: requestId_V3_KYCAgeCredential,
    schema: schemaBigInt,
    claimPathKey: schemaClaimPathKey,
    operator: Operators.LT,
    value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
    slotIndex: 0,
    queryHash: "",
    circuitIds: ["credentialAtomicQueryV3OnChain-beta.1"],
    allowedIssuers: [],
    skipClaimRevocationCheck: false,
    verifierID: verifierId.bigInt(),
    nullifierSessionID: 11837215,
    groupID: 0,
    proofType: 0,
  };

  queryV3KYCAgeCredential.queryHash = calculateQueryHashV3(
    queryV3KYCAgeCredential.value.map((i) => BigInt(i)),
    queryV3KYCAgeCredential.schema,
    queryV3KYCAgeCredential.slotIndex,
    queryV3KYCAgeCredential.operator,
    queryV3KYCAgeCredential.claimPathKey,
    1, //queryV3KYCAgeCredential.value.length, // for operator LT it should be 1 for value
    1, // merklized
    queryV3KYCAgeCredential.skipClaimRevocationCheck ? 0 : 1,
    queryV3KYCAgeCredential.verifierID.toString(),
    queryV3KYCAgeCredential.nullifierSessionID,
  ).toString();

  const dataV3KYCAgeCredential = packV3ValidatorParams(queryV3KYCAgeCredential);

  const invokeRequestMetadataKYCAgeCredential = {
    id: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
    thid: "7f38a193-0918-4a48-9fac-36adfdb8b543",
    from: DID.parseFromId(verifierId).string(),
    body: {
      reason: "for testing submitZKPResponseV2",
      transaction_data: {
        contract_address: await verifier.getAddress(),
        method_id: methodId,
        chain_id: chainId,
        network: network,
      },
      scope: [
        {
          id: queryV3KYCAgeCredential.requestId,
          circuitId: queryV3KYCAgeCredential.circuitIds[0],
          query: {
            allowedIssuers: !queryV3KYCAgeCredential.allowedIssuers.length
              ? ["*"]
              : queryV3KYCAgeCredential.allowedIssuers,
            context:
              "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
            credentialSubject: {
              birthday: {
                $lt: 20020101,
              },
            },
            type: "KYCAgeCredential",
          },
        },
      ],
    },
  };

  await verifier.setZKPRequest(requestId_V3_KYCAgeCredential, {
    metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential),
    validator: validatorV3,
    data: dataV3KYCAgeCredential,
  });

  console.log(JSON.stringify(invokeRequestMetadataKYCAgeCredential, null, "\t"));

  console.log(`Request ID: ${requestId_V3_KYCAgeCredential} is set`);
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