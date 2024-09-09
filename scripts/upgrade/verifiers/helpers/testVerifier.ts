import { Contract, ethers } from "ethers";
import { calculateQueryHashV3 } from "../../../../test/utils/query-hash-utils";
import { packV3ValidatorParams } from "../../../../test/utils/validator-pack-utils";
import { Blockchain, DID, DidMethod, NetworkId } from "@iden3/js-iden3-core";
import { buildVerifierId } from "../../../deployStateCrossChainFullSet";
import hre from "hardhat";

export async function submitZKPResponseV2_KYCAgeCredential(requestId: number, verifier: Contract) {
  console.log("================= submitZKPResponseV2 V3 SIG KYCAgeCredential ===================");

  const [signer] = await hre.ethers.getSigners();
  console.log(signer.address);
  /*const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const signer = new ethers.Wallet(
    "57d689f9a9334c1c0f72f1d4bd492d990e5061c9cf01cccdc37f2e292689ad1e",
    provider,
  ); */

  const txSubmitZKPResponseV2_V3Sig = await verifier.connect(signer).submitZKPResponseV2(
    [
      {
        requestId: requestId,
        zkProof:
          "0x00000000000000000000000000000000000000000000000000000000000001201cb20dcc9646913c365643c352c43252992c8b5d0d9485987fddc19a9e217465248f653576543e74d2c25fe478393d576c76a7ff4a9d67df44fee138b7269f61063131064c862b5f0bc804e489db1f4980e2ea7f9f0b0e014699d9488d914ffa1ebc920717098214fa1ddd62550c2e2e52d4067b0f7ce4728455087e8a77cf1a12c7834f023dbe2ad36a8a4db92f9db1fa55ca670a5cd43a8765e5330cdd98671f33d78f47be087dce0a0fef211353e17c27a3e3702a9647d68e0a8db6aacd4711bdb6195759583b42f33ba529eb687ef2dd17013db3e2238ca7ee364be93fa614a28119247fe1e02956796a1ddb47c74f2cf377d120e87f7f32af0899b69167000000000000000000000000000000000000000000000000000000000000000e000c9811c3658ef37990ef27cd48ca08d91d694e0dcc498918e7721d1040a1012b7443000ef33fea860985147edf86593b918a0038d32bafcafad7274929bfda056324c3738c1ec5ac39adf6c152bac5136cfb0eee85bb51f9f422d05f22c7d30000000000000000000000000000000000000000000000000000000000000000007f6d05b407d0f977e64b62a68cc517210c13bff189ae74d6ceb7741f4c06900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000050000000000000000000000006622b9ffcf797282b86acef4f688ad1ae5d69ff30000000000000000000000000000000000000000000000000000000000000000000f25056324c3738c1ec5ac39adf6c152bac5136cfb0eee85bb51f9f422c301247623dbddbfd548d58dd3b32d169374685fa9bb74101cb6bebd7765d0d1cf1d0000000000000000000000000000000000000000000000000000000066db1ca60000000000000000000000000000000000000000000000000000000000000001",
        data: "0x",
      },
    ],
    "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000010676c6f62616c537461746550726f6f6600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000066db1caa01a10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000412b146a50434105104fddbf627a1bd349507a0119f92bc93ed56b4037e098f2390318205fb49aacac129ec904f9a269ff1c2067c8c481c0cd6e158dbe6d9710811c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000a737461746550726f6f6600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000066db1caa000f25056324c3738c1ec5ac39adf6c152bac5136cfb0eee85bb51f9f422c301247623dbddbfd548d58dd3b32d169374685fa9bb74101cb6bebd7765d0d1cf1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000041736d0861c84ffc047441b8042b7f8700f4705003f9aad227533a27b5336fb586167458b42dda28516d20420c772c8873cc6eba10cead7961423a6cc1a292b6721c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000a737461746550726f6f6600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000066db1caa000f25056324c3738c1ec5ac39adf6c152bac5136cfb0eee85bb51f9f422c3012eaea58e1fed3c2ad52c433e8a72b3d61e5e354fef0507ad594f5b53863ccd320000000000000000000000000000000000000000000000000000000066db1c9900000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000412c8f5564e1bcea52b14fc6144f931a0e2d0212f408ea6d2c1be74b8d111137d3681a02dc366fb8f3262a115430f088d7c14db6731ae64b218cef8990593ac0251b00000000000000000000000000000000000000000000000000000000000000",
  );

  const receiptV3Sig = await txSubmitZKPResponseV2_V3Sig.wait();
  console.log(`txSubmitZKPResponseV2 V3 Sig Proof gas consumed: `, receiptV3Sig.gasUsed);
}

export async function setZKPRequest_KYCAgeCredential(
  requestId: number,
  verifier: Contract,
  validatorV3Address: string,
) {
  console.log("================= setZKPRequest V3 SIG KYCAgeCredential ===================");

  const requestIdExists = await verifier.requestIdExists(requestId);
  if (!requestIdExists) {
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

    const queryV3KYCAgeCredential = {
      requestId: requestId,
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

    const chainId = hre.network.config.chainId;
    const network = hre.network.name;
    const methodId = "ade09fcd";

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

    await verifier.setZKPRequest(requestId, {
      metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential),
      validator: validatorV3Address,
      data: dataV3KYCAgeCredential,
    });

    console.log(`Request ID: ${requestId} is set`);
  } else {
    console.log(`Request ID: ${requestId} already exists`);
  }
}
