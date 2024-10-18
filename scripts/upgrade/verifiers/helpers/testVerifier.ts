import { Contract, JsonRpcProvider } from "ethers";
import { calculateQueryHashV3 } from "../../../../test/utils/query-hash-utils";
import { packV3ValidatorParams } from "../../../../test/utils/validator-pack-utils";
import {
  Blockchain,
  buildDIDType,
  BytesHelper,
  DID,
  DidMethod,
  genesisFromEthAddress,
  Id,
  NetworkId,
} from "@iden3/js-iden3-core";
import hre from "hardhat";
import { Hex } from "@iden3/js-crypto";
import {
  initCircuitStorage,
  initInMemoryDataStorageAndWallets,
  initProofService,
} from "./walletSetup";
import {
  CircuitId,
  core,
  CredentialRequest,
  CredentialStatusType,
  hexToBytes,
  Operators,
  ProofGenerationOptions,
  ProofService,
  ProofType,
  ZeroKnowledgeProofRequest,
} from "@0xpolygonid/js-sdk";
import { ProofData } from "@iden3/js-jwz";
import { packCrossChainProofs, packZKProof } from "../../../../test/utils/packData";

const rhsUrl = "https://rhs-staging.polygonid.me";

function createKYCAgeCredential(did: core.DID, birthday: number) {
  const credentialRequest: CredentialRequest = {
    credentialSchema:
      "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json/KYCAgeCredential-v3.json",
    type: "KYCAgeCredential",
    credentialSubject: {
      id: did.string(),
      birthday: birthday,
      documentType: 99,
    },
    expiration: 12345678888,
    revocationOpts: {
      type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      id: rhsUrl,
    },
  };
  return credentialRequest;
}

function createKYCAgeCredentialRequest(
  requestId: number,
  circuitId: CircuitId,
  credentialRequest: CredentialRequest,
): ZeroKnowledgeProofRequest {
  const proofReq: ZeroKnowledgeProofRequest = {
    id: requestId,
    circuitId,
    optional: false,
    query: {
      allowedIssuers: ["*"],
      type: credentialRequest.type,
      context:
        "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
      credentialSubject: {
        birthday: {
          $lt: 20020101,
        },
      },
    },
  };

  const proofReqV3: ZeroKnowledgeProofRequest = {
    id: requestId,
    circuitId: CircuitId.AtomicQueryV3OnChain,
    params: {
      nullifierSessionId: 11837215,
    },
    query: {
      groupId: 0,
      allowedIssuers: ["*"],
      proofType: ProofType.BJJSignature,
      type: credentialRequest.type,
      context:
        "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
      credentialSubject: {
        birthday: {
          $lt: 20020101,
        },
      },
    },
  };

  if (circuitId === CircuitId.AtomicQueryV3OnChain) {
    return proofReqV3;
  }
  return proofReq;
}

async function generateProof(
  circuitId: CircuitId,
  credentialRequest: CredentialRequest,
  userDID: core.DID,
  requestId: number,
  proofService: ProofService,
  opts?: ProofGenerationOptions,
) {
  const proofReq: ZeroKnowledgeProofRequest = createKYCAgeCredentialRequest(
    requestId,
    circuitId,
    credentialRequest,
  );

  const { proof, pub_signals } = await proofService.generateProof(proofReq, userDID, opts);

  return { proof, pub_signals };
}

function buildVerifierId(
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

function prepareProof(proof: ProofData) {
  const { pi_a, pi_b, pi_c } = proof;
  const [[p1, p2], [p3, p4]] = pi_b;
  const preparedProof = {
    pi_a: pi_a.slice(0, 2),
    pi_b: [
      [p2, p1],
      [p4, p3],
    ],
    pi_c: pi_c.slice(0, 2),
  };

  return { ...preparedProof };
}

function getParamsFromChainId(chainId: number) {
  let rpcUrl: string;
  let method: string;
  let blockchain: string;
  let networkId: string;

  switch (chainId) {
    case 80002:
      rpcUrl = process.env.POLYGON_AMOY_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Amoy;
      break;
    case 137:
      rpcUrl = process.env.POLYGON_MAINNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Main;
      break;
    case 1:
      rpcUrl = process.env.ETHEREUM_MAINNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Ethereum;
      networkId = NetworkId.Main;
      break;
    case 11155111:
      rpcUrl = process.env.ETHEREUM_SEPOLIA_RPC_URL as string;
      method = DidMethod.PolygonId;
      blockchain = Blockchain.Ethereum;
      networkId = NetworkId.Sepolia;
      break;
    case 2442:
      rpcUrl = process.env.ZKEVM_CARDONA_RPC_URL as string;
      method = DidMethod.PolygonId;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Cardona;
      break;
    case 1101:
      rpcUrl = process.env.ZKEVM_MAINNET_RPC_URL as string;
      method = DidMethod.PolygonId;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Zkevm;
      break;
    case 59141:
      rpcUrl = process.env.LINEA_SEPOLIA_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Linea;
      networkId = NetworkId.Sepolia;
      break;
    case 59144:
      rpcUrl = process.env.LINEA_MAINNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Linea;
      networkId = NetworkId.Main;
      break;
    case 21000:
      rpcUrl = process.env.PRIVADO_MAIN_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Privado;
      networkId = NetworkId.Main;
      break;
    case 21001:
      rpcUrl = process.env.PRIVADO_TEST_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Privado;
      networkId = NetworkId.Test;
      break;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }

  return { rpcUrl, method, blockchain, networkId };
}

export async function submitZKPResponses_KYCAgeCredential(
  requestId: number,
  verifier: Contract,
  opts: any,
) {
  console.log("================= submitZKPResponseV2 V3 SIG KYCAgeCredential ===================");
  let chainId: number;
  let networkName: string;
  if (opts.provider) {
    chainId = Number((await opts.provider.getNetwork()).chainId);
    networkName = (await opts.provider.getNetwork()).name;
  } else {
    chainId = hre.network.config.chainId || 80002;
    networkName = hre.network.name;
  }

  const { rpcUrl, method, blockchain, networkId } = getParamsFromChainId(chainId);

  let signer: any;

  if (opts.signer) {
    signer = opts.signer;
  } else {
    const [signerHre] = await hre.ethers.getSigners();
    signer = signerHre;
  }

  console.log("Signer: ", signer.address);

  if (!opts.stateContractAddress) {
    throw new Error("stateContractAddress is not set");
  }

  const { dataStorage: issuerDataStorage, identityWallet: issuerIdentityWallet } =
    await initInMemoryDataStorageAndWallets([
      {
        rpcUrl: rpcUrl,
        contractAddress: opts.stateContractAddress,
        chainId: chainId,
      },
    ]);

  const {
    dataStorage: userDataStorage,
    credentialWallet: userCredentialWallet,
    identityWallet: userIdentityWallet,
  } = await initInMemoryDataStorageAndWallets([
    {
      rpcUrl: rpcUrl,
      contractAddress: opts.stateContractAddress,
      chainId: chainId,
    },
  ]);

  const circuitStorage = await initCircuitStorage();
  const userProofService = await initProofService(
    userIdentityWallet,
    userCredentialWallet,
    userDataStorage.states,
    circuitStorage,
  );

  console.log("=============== user did ===============");
  const { did: userDID } = await userIdentityWallet.createIdentity({
    method: method,
    blockchain: blockchain,
    networkId: networkId,
    revocationOpts: {
      type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      id: rhsUrl,
    },
  });

  console.log(userDID.string());

  console.log("=============== issuer did ===============");
  const { did: issuerDID } = await issuerIdentityWallet.createIdentity({
    method: method,
    blockchain: blockchain,
    networkId: networkId,
    revocationOpts: {
      type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      id: rhsUrl,
    },
  });
  console.log(issuerDID.string());

  console.log("=============== issue kyc credential ===============");
  // credential is issued on the profile!
  const profileDID = await userIdentityWallet.createProfile(userDID, 50, issuerDID.string());
  const credentialRequest = createKYCAgeCredential(profileDID, 19960424);
  const credential = await issuerIdentityWallet.issueCredential(issuerDID, credentialRequest);

  await issuerDataStorage.credential.saveCredential(credential);
  await userDataStorage.credential.saveCredential(credential);

  const challenge = BytesHelper.bytesToInt(hexToBytes(await signer.getAddress()));

  console.log("================= generate V3 Sig proof ===================");
  // Verifier Id in the verifier network
  const verifierId = buildVerifierId(opts.verifierContractAddress, {
    blockchain: blockchain,
    networkId: networkId,
    method: method,
  });

  const { proof: proofV3Sig, pub_signals: pub_signalsV3Sig } = await generateProof(
    CircuitId.AtomicQueryV3OnChain,
    credentialRequest,
    profileDID,
    requestId,
    userProofService,
    {
      verifierDid: DID.parseFromId(verifierId),
      challenge: BigInt(challenge),
      skipRevocation: false,
    },
  );
  const preparedProofV3Sig = prepareProof(proofV3Sig);

  // In forks in local increment time for avoiding "Proof generated in the future is not valid"
  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("Increase time for 55 minutes in local network...");
    await hre.network.provider.send("evm_increaseTime", [3300]);
  }

  console.log("================= submitZKPResponse V3 Sig proof ===================");
  const txSubmitZKPResponse_V3Sig = await verifier
    .connect(signer)
    .submitZKPResponse(
      requestId,
      pub_signalsV3Sig,
      preparedProofV3Sig.pi_a,
      preparedProofV3Sig.pi_b,
      preparedProofV3Sig.pi_c,
    );
  const receiptV3Sig_old = await txSubmitZKPResponse_V3Sig.wait();
  console.log(`txSubmitZKPResponse V3 Sig Proof gas consumed: `, receiptV3Sig_old.gasUsed);

  console.log("================= submitZKPResponseV2 V3 Sig proof ===================");
  const crossChainProofs = packCrossChainProofs([]);
  const metadatas = "0x";

  const zkProofV3Sig = packZKProof(
    pub_signalsV3Sig,
    preparedProofV3Sig.pi_a,
    preparedProofV3Sig.pi_b,
    preparedProofV3Sig.pi_c,
  );

  const txSubmitZKPResponseV2_V3Sig = await verifier.connect(signer).submitZKPResponseV2(
    [
      {
        requestId,
        zkProof: zkProofV3Sig,
        data: metadatas,
      },
    ],
    crossChainProofs,
    {
      gasPrice: 50000000000,
      initialBaseFeePerGas: 25000000000,
      gasLimit: 1000000,
    },
  );

  const receiptV3Sig = await txSubmitZKPResponseV2_V3Sig.wait();
  console.log(`txSubmitZKPResponseV2 V3 Sig Proof gas consumed: `, receiptV3Sig.gasUsed);
}

export async function setZKPRequest_KYCAgeCredential(
  requestId: number,
  verifier: Contract,
  validatorV3Address: string,
  provider?: JsonRpcProvider,
) {
  console.log("================= setZKPRequest V3 SIG KYCAgeCredential ===================");

  const requestIdExists = await verifier.requestIdExists(requestId);
  if (!requestIdExists) {
    let chainId: number;
    let network: string;

    if (provider) {
      chainId = Number((await provider.getNetwork()).chainId);
      network = (await provider.getNetwork()).name;
    } else {
      chainId = hre.network.config.chainId || 80002;
      network = hre.network.name;
    }

    const methodId = "ade09fcd";

    const { method, blockchain, networkId } = getParamsFromChainId(chainId);

    const verifierId = buildVerifierId(await verifier.getAddress(), {
      blockchain: blockchain,
      networkId: networkId,
      method: method,
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

    const tx = await verifier.setZKPRequest(requestId, {
      metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential),
      validator: validatorV3Address,
      data: dataV3KYCAgeCredential,
    });

    console.log(`Request ID: ${requestId} is set in tx ${tx.hash}`);
    await tx.wait();
  } else {
    console.log(`Request ID: ${requestId} already exists`);
  }
}
