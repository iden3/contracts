import hre, { ethers } from "hardhat";
import { packV3ValidatorParams, packValidatorParams } from "../../test/utils/validator-pack-utils";
import { calculateQueryHashV2, calculateQueryHashV3 } from "../../test/utils/query-hash-utils";
import { Blockchain, DidMethod, NetworkId, DID } from "@iden3/js-iden3-core";
import { buildVerifierId } from "../deploy/deployCrossChainVerifierWithRequests";
import { byteEncoder, CircuitId, Operators } from "@0xpolygonid/js-sdk";
import { contractsInfo } from "../../helpers/constants";
import { Hex } from "@iden3/js-crypto";
import { getChainId } from "../../helpers/helperUtils";

export function getAuthV2RequestId(): number {
  const circuitHash = ethers.keccak256(byteEncoder.encode(CircuitId.AuthV2));
  const dataView = new DataView(Hex.decodeString(circuitHash.replace("0x", "")).buffer);
  const id = dataView.getUint32(0);
  return id;
}

async function main() {
  const circuitName: CircuitId = CircuitId.AuthV2; // TODO put your circuit here;
  let requestId = 117; // TODO put your request here;
  const allowedIssuers = []; // TODO put your allowed issuers here

  const chainId = await getChainId();
  const network = hre.network.name;

  const methodId = "ade09fcd";

  const verifier = await ethers.getContractAt(
    contractsInfo.UNIVERSAL_VERIFIER.name,
    contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
  );

  const verifierId = buildVerifierId(await verifier.getAddress(), {
    blockchain: Blockchain.Polygon,
    networkId: NetworkId.Amoy,
    method: DidMethod.Iden3,
  });

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
  let data: string;
  switch (circuitName) {
    case CircuitId.AtomicQueryMTPV2OnChain:
      validatorAddress = contractsInfo.VALIDATOR_MTP.unifiedAddress;
      query.queryHash = calculateQueryHashV2(
        query.value,
        query.schema,
        query.slotIndex,
        query.operator,
        query.claimPathKey,
        query.claimPathNotExists,
      ).toString();
      data = packValidatorParams(query);

      break;
    case CircuitId.AtomicQuerySigV2OnChain:
      validatorAddress = contractsInfo.VALIDATOR_SIG.unifiedAddress;
      query.queryHash = calculateQueryHashV2(
        query.value,
        query.schema,
        query.slotIndex,
        query.operator,
        query.claimPathKey,
        query.claimPathNotExists,
      ).toString();
      data = packValidatorParams(query);
      break;
    case CircuitId.AtomicQueryV3OnChain:
      validatorAddress = contractsInfo.VALIDATOR_V3.unifiedAddress;
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
      data = packV3ValidatorParams(query);

      break;

    case CircuitId.AuthV2:
      validatorAddress = contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress;
      data = "0x";
      requestId = getAuthV2RequestId();
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

  const requestIdExists = await verifier.requestIdExists(requestId);
  if (requestIdExists) {
    throw new Error(`Request ID: ${requestId} already exists`);
  }

  const tx = await verifier.setZKPRequest(
    requestId,
    {
      metadata:
        circuitName === CircuitId.AuthV2
          ? "0x"
          : JSON.stringify(invokeRequestMetadataKYCAgeCredential),
      validator: validatorAddress,
      data,
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
