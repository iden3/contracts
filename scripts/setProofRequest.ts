import hre, { ethers } from "hardhat";
import { packValidatorParams } from "../test/utils/validator-pack-utils";
import { calculateQueryHashV2 } from "../test/utils/query-hash-utils";
import { Blockchain, DidMethod, NetworkId, DID } from "@iden3/js-iden3-core";
import { buildVerifierId } from "./deployCrossChainVerifierWithRequests";

async function main() {
  const chainId = hre.network.config.chainId;
  const network = hre.network.name;

  const methodId = "ade09fcd";

  const verifier = await ethers.getContractAt(
    "UniversalVerifier",
    "0x830377FF46bEfB4404767Dceba0914c071930Ef3", //TODO put correct universal verifier address here
  );

  const validator1 = "0x2389af3406e0a0127756ee62b83800196091e929"; // TODO put you values here
  const validator2 = "0xce2e2f251c9a7e00d03a295ac04bf38aba836d86"; // TODO put you values here
  const validator3 = "0xbdc75c0ead262f2dcf73ae0b5cddda83a3e69f00"; // TODO put you values here

  const circuitName = "credentialAtomicQueryMTPV2OnChain";

  const requestId = 20; // TODO put your request here;

  let validatorAddress;

  for (const address of [validator1, validator2, validator3]) {
    const validator = await ethers.getContractAt("ICircuitValidator", address);
    const name = await validator.getSupportedCircuitIds();
    console.log(name[0]);
    if (name[0] === circuitName) {
      validatorAddress = address;
      break;
    }
  }

  // const requests = await verifier.getZKPRequests(0, 3);
  // for (const request of requests) {
  //   const validator = await ethers.getContractAt("ICircuitValidator", request.validator);
  //   const circuitName = await validator.getSupportedCircuitIds();
  //   if (circuitName.includes("credentialAtomicQueryMTPV2OnChain")) {
  //     validatorAddress = request.validator;
  //     break;
  //   }
  // }

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

  const query: any = {
    requestId: requestId,
    schema: schemaBigInt,
    claimPathKey: schemaClaimPathKey,
    operator: Operators.NE,
    slotIndex: 0,
    value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
    circuitIds: [circuitName],
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
          circuitId: circuitName,
          id: requestId,
          query: {
            allowedIssuers: ["*"],
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

  await verifier.setZKPRequest(
    requestId,
    {
      metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential),
      validator: validatorAddress,
      data: data,
    },
    // {
    //   gasPrice: 50000000000,
    //   initialBaseFeePerGas: 25000000000,
    //   gasLimit: 10000000
    // }
  );
  console.log(JSON.stringify(invokeRequestMetadataKYCAgeCredential, null, "\t"));

  console.log(`Request ID: ${requestId} is set`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
