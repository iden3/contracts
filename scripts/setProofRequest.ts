import hre, { ethers } from "hardhat";
import { packValidatorParams } from "../test/utils/validator-pack-utils";
import { calculateQueryHashV2, calculateQueryHashV3 } from "../test/utils/query-hash-utils";
import { Blockchain, DidMethod, NetworkId, DID } from "@iden3/js-iden3-core";
import { buildVerifierId } from "./deployCrossChainVerifierWithRequests";
import { getConfig } from "../helpers/helperUtils";

async function main() {
  const MTP_V2_CIRCUIT_NAME = "credentialAtomicQueryMTPV2OnChain";
  const SIG_V2_CIRCUIT_NAME = "credentialAtomicQuerySigV2OnChain";
  const V3_CIRCUIT_NAME = "credentialAtomicQueryV3OnChain-beta.1";

  const circuitName: string = V3_CIRCUIT_NAME; // TODO put your circuit here;
  const requestId = 117; // TODO put your request here;
  const allowedIssuers = []; // TODO put your allowed issuers here

  const chainId = hre.network.config.chainId;
  const network = hre.network.name;

  const methodId = "ade09fcd";

  const config = getConfig();
  if (!ethers.isAddress(config.universalVerifierContractAddress)) {
    throw new Error("UNIVERSAL_VERIFIER_CONTRACT_ADDRESS is not set");
  }

  const verifier = await ethers.getContractAt(
    "UniversalVerifier",
    config.universalVerifierContractAddress,
  );

  const verifierId = buildVerifierId(await verifier.getAddress(), {
    blockchain: Blockchain.Polygon,
    networkId: NetworkId.Amoy,
    method: DidMethod.Iden3,
  });

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

  // you can run https://go.dev/play/p/oB_oOW7kBEw to get schema hash and claimPathKey using YOUR schema
  const schemaBigInt = "74977327600848231385663280181476307657";

  // merklized path to field in the W3C credential according to JSONLD  schema e.g. birthday in the KYCAgeCredential under the url "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld"
  const schemaClaimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";

  let query: any = {
    requestId: requestId,
    schema: schemaBigInt,
    claimPathKey: schemaClaimPathKey,
    operator: Operators.NE,
    slotIndex: 0,
    queryHash: "",
    value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
    circuitIds: [circuitName],
    skipClaimRevocationCheck: false,
    claimPathNotExists: 0,
  };

  let validatorAddress: string;
  switch (circuitName) {
    case MTP_V2_CIRCUIT_NAME:
      if (!ethers.isAddress(config.validatorMTPContractAddress)) {
        throw new Error("VALIDATOR_MTP_CONTRACT_ADDRESS is not set");
      }
      validatorAddress = config.validatorMTPContractAddress;
      query.queryHash = calculateQueryHashV2(
        query.value,
        query.schema,
        query.slotIndex,
        query.operator,
        query.claimPathKey,
        query.claimPathNotExists,
      ).toString();
      break;
    case SIG_V2_CIRCUIT_NAME:
      if (!ethers.isAddress(config.validatorSigContractAddress)) {
        throw new Error("VALIDATOR_SIG_CONTRACT_ADDRESS is not set");
      }
      validatorAddress = config.validatorSigContractAddress;
      query.queryHash = calculateQueryHashV2(
        query.value,
        query.schema,
        query.slotIndex,
        query.operator,
        query.claimPathKey,
        query.claimPathNotExists,
      ).toString();
      break;
    case V3_CIRCUIT_NAME:
      if (!ethers.isAddress(config.validatorV3ContractAddress)) {
        throw new Error("VALIDATOR_V3_CONTRACT_ADDRESS is not set");
      }
      validatorAddress = config.validatorV3ContractAddress;
      query = {
        ...query,
        allowedIssuers: allowedIssuers,
        verifierID: verifierId.bigInt(),
        nullifierSessionID: 11837215,
        groupID: 0,
        proofType: 0,
      };

      query.queryHash = calculateQueryHashV3(
        query.value.map((i) => BigInt(i)),
        query.schema,
        query.slotIndex,
        query.operator,
        query.claimPathKey,
        1, //queryV3KYCAgeCredential.value.length, // for operator NE, LT it should be 1 for value
        1, // merklized
        query.skipClaimRevocationCheck ? 0 : 1,
        query.verifierID.toString(),
        query.nullifierSessionID,
      ).toString();
      break;
    default:
      throw new Error(`Unsupported circuit name: ${circuitName}`);
  }

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
          id: requestId,
          circuitId: circuitName,
          query: {
            allowedIssuers: !allowedIssuers.length ? ["*"] : allowedIssuers,
            context:
              "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
            credentialSubject: {
              birthday: {
                $ne: 20020101,
              },
            },
            type: "KYCAgeCredential",
          },
        },
      ],
    },
  };

  const data = packValidatorParams(query);

  const requestIdExists = await verifier.requestIdExists(requestId);
  if (requestIdExists) {
    throw new Error(`Request ID: ${requestId} already exists`);
  }

  const tx = await verifier.setZKPRequest(
    requestId,
    {
      metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential),
      validator: validatorAddress,
      data: data,
    },
    // {
    //   gasPrice: 50000000000,
    //   initialBaseFeePerGas: 25000000000,
    //   gasLimit: 10000000,
    // },
  );

  console.log(JSON.stringify(invokeRequestMetadataKYCAgeCredential, null, "\t"));

  console.log(`Request ID: ${requestId} is set in tx: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
