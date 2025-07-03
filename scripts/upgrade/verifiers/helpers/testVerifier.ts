import { Contract, JsonRpcProvider } from "ethers";
import {
  calculateQueryHashV2,
  calculateQueryHashV3,
} from "../../../../test/utils/query-hash-utils";
import {
  packV3ValidatorParams,
  packValidatorParams,
} from "../../../../test/utils/validator-pack-utils";
import { Blockchain, BytesHelper, DID, DidMethod, NetworkId } from "@iden3/js-iden3-core";
import hre from "hardhat";
import {
  initCircuitStorage,
  initInMemoryDataStorageAndWallets,
  initPackageManager,
  initProofService,
} from "./walletSetup";
import {
  BasicMessage,
  buildVerifierId,
  CircuitId,
  ContractInvokeRequest,
  ContractInvokeRequestBody,
  ContractInvokeResponse,
  ContractInvokeTransactionData,
  ContractMessageHandlerOptions,
  ContractRequestHandler,
  core,
  CredentialRequest,
  CredentialStatusType,
  defaultEthConnectionConfig,
  hexToBytes,
  IPackageManager,
  OnChainZKPVerifier,
  Operators,
  ProofGenerationOptions,
  ProofService,
  ProofType,
  PROTOCOL_CONSTANTS,
  ZeroKnowledgeProofRequest,
} from "@0xpolygonid/js-sdk";
import { ProofData } from "@iden3/js-jwz";
import { Groth16VerifierType } from "../../../../helpers/DeployHelper";
import { getChainId } from "../../../../helpers/helperUtils";
import { calculateRequestID } from "../../../../test/utils/id-calculation-utils";
import * as uuid from "uuid";

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
  requestId: bigint,
  circuitId: CircuitId,
  credentialRequest: CredentialRequest,
): ZeroKnowledgeProofRequest {
  const proofReq: ZeroKnowledgeProofRequest = {
    id: requestId.toString(),
    circuitId,
    optional: false,
    query: {
      allowedIssuers: ["*"],
      type: credentialRequest.type,
      context:
        "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
      credentialSubject: {
        birthday: {
          $ne: 20020101,
        },
      },
    },
  };

  const proofReqV3: ZeroKnowledgeProofRequest = {
    id: requestId.toString(),
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
          $ne: 20020101,
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
  requestId: bigint,
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

function getParamsFromChainId(chainId: number) {
  let rpcUrl: string;
  let method: string;
  let blockchain: string;
  let networkId: string;

  switch (chainId) {
    case 31337:
      rpcUrl = "http://localhost:8545";
      method = DidMethod.Iden3;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Amoy;
      break;
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
      rpcUrl = process.env.PRIVADO_MAINNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Privado;
      networkId = NetworkId.Main;
      break;
    case 21001:
      rpcUrl = process.env.PRIVADO_TESTNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Privado;
      networkId = NetworkId.Test;
      break;
    case 45056:
      rpcUrl = process.env.BILLIONS_MAINNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Billions;
      networkId = NetworkId.Main;
      break;
    case 6913:
      rpcUrl = process.env.BILLIONS_TESTNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Billions;
      networkId = NetworkId.Test;
      break;
    case 1819540093:
      rpcUrl = process.env.TRYAGAIN_BALI_03_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Amoy;
      break;
    case 1313161555:
      rpcUrl = process.env.AURORA_TESTNET_RPC_URL as string;
      method = DidMethod.Iden3;
      blockchain = Blockchain.Polygon;
      networkId = NetworkId.Amoy;
      break;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }

  return { rpcUrl, method, blockchain, networkId };
}

export async function submitZKPResponses_KYCAgeCredential(
  requestId: bigint,
  verifier: Contract,
  verifierType: "mtpV2" | "sigV2" | "v3",
  opts: any,
) {
  console.log(`================= ${verifierType} KYCAgeCredential ===================`);
  let chainId: number;
  let networkName: string;
  if (opts.provider) {
    chainId = Number((await opts.provider.getNetwork()).chainId);
    networkName = (await opts.provider.getNetwork()).name;
  } else {
    chainId = 80002;
    networkName = hre.network.name;
  }

  const { rpcUrl, method, blockchain, networkId } = getParamsFromChainId(chainId);

  console.log(
    `Chain ID: ${chainId}, RPC URL: ${rpcUrl}, Method: ${method}, Network ID: ${networkId}`,
  );
  let signer: any;

  if (opts.signer) {
    signer = opts.signer;
  } else {
    signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, new JsonRpcProvider(rpcUrl)); //signerHre;
  }

  console.log("Signer: ", await signer.address);

  if (!opts.stateContractAddress) {
    throw new Error("stateContractAddress is not set");
  }

  const {
    dataStorage: issuerDataStorage,
    credentialWallet: issuerCredentialWallet,
    identityWallet: issuerIdentityWallet,
  } = await initInMemoryDataStorageAndWallets([
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

  const packageMgr = await initPackageManager(
    await circuitStorage.loadCircuitData(CircuitId.AuthV2),
    userProofService.generateAuthV2Inputs.bind(userProofService),
    userProofService.verifyState.bind(userProofService),
  );

  const issuerProofService = await initProofService(
    issuerIdentityWallet,
    issuerCredentialWallet,
    issuerDataStorage.states,
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

  console.log(`================= generate ${verifierType} proof ===================`);

  // Verifier Id in the verifier network
  const verifierId = buildVerifierId(await verifier.getAddress(), {
    blockchain: Blockchain.Privado,
    networkId: NetworkId.Main,
    method: DidMethod.Iden3,
  });
  const verifierDID = DID.parseFromId(verifierId);
  let proofReq: ZeroKnowledgeProofRequest;

  switch (verifierType) {
    case "mtpV2":
      const res = await issuerIdentityWallet.addCredentialsToMerkleTree([credential], issuerDID);
      console.log("================= push states to rhs ===================");

      await issuerIdentityWallet.publishRevocationInfoByCredentialStatusType(
        issuerDID,
        CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        { rhsUrl },
      );

      console.log("================= publish to blockchain ================");

      const txId = await issuerProofService.transitState(
        issuerDID,
        res.oldTreeState,
        true,
        issuerDataStorage.states,
        signer,
      );
      console.log(txId);

      console.log("================= generate credentialAtomicMTPV2 ===================");
      const credsWithIden3MTPProof = await issuerIdentityWallet.generateIden3SparseMerkleTreeProof(
        issuerDID,
        res.credentials,
        txId,
      );

      // console.log(credsWithIden3MTPProof);
      await issuerCredentialWallet.saveAll(credsWithIden3MTPProof);
      // We need to save the credential to the user wallet
      await userCredentialWallet.saveAll(credsWithIden3MTPProof);

      proofReq = createKYCAgeCredentialRequest(
        requestId,
        CircuitId.AtomicQueryMTPV2OnChain,
        credentialRequest,
      );
      break;
    case "sigV2":
      proofReq = createKYCAgeCredentialRequest(
        requestId,
        CircuitId.AtomicQuerySigV2OnChain,
        credentialRequest,
      );
      break;
    case "v3":
      proofReq = createKYCAgeCredentialRequest(
        requestId,
        CircuitId.AtomicQueryV3OnChain,
        credentialRequest,
      );

      break;
  }

  const ciResponse = await submitResponse(
    [proofReq],
    verifierDID,
    profileDID,
    signer.address,
    packageMgr,
    userProofService,
    {
      verifierContractAddress: await verifier.getAddress(),
      resolverUrl: "https://resolver.privado.id",
      verifierChainId: chainId,
      verifierRpcUrl: rpcUrl,
      ethSigner: signer,
    },
  );

  // In forks in local increment time for avoiding "Proof generated in the future is not valid"
  /*if (networkName === "hardhat" || networkName === "localhost") {
    console.log("Increase time for 55 minutes in local network...");
    await hre.network.provider.send("evm_increaseTime", [3300]);
  }*/

  if (
    (ciResponse as ContractInvokeResponse).body.scope.length === 1 &&
    (ciResponse as ContractInvokeResponse).body.scope[0].id === requestId.toString()
  ) {
    console.log(`================= submitResponse Proof OK!!!! ===================`);
  } else {
    console.log(`================= submitResponse Proof KO!!!! ===================`);
  }
}

export async function submitResponse(
  requests: ZeroKnowledgeProofRequest[],
  verifierDID: DID,
  profileDID: DID,
  userAddress: string,
  packageMgr: IPackageManager,
  proofService: ProofService,
  opts: any,
): Promise<BasicMessage | null> {
  const methodId = "06c86a91";
  const conf = defaultEthConnectionConfig;
  conf.contractAddress = opts.verifierContractAddress;
  conf.url = opts.verifierRpcUrl;
  conf.chainId = Number(opts.verifierChainId || 31337); // verifier chain id

  const zkpVerifier = new OnChainZKPVerifier([conf], { didResolverUrl: opts.resolverUrl });
  const contractRequestHandler = new ContractRequestHandler(packageMgr, proofService, zkpVerifier);

  const transactionData: ContractInvokeTransactionData = {
    contract_address: opts.verifierContractAddress,
    method_id: methodId,
    chain_id: conf.chainId,
  };

  const challenge = BytesHelper.bytesToInt(hexToBytes(userAddress));

  const options: ContractMessageHandlerOptions = {
    senderDid: profileDID,
    ethSigner: opts.ethSigner,
    challenge,
  };

  const ciRequestBody: ContractInvokeRequestBody = {
    reason: "reason",
    transaction_data: transactionData,
    scope: requests,
  };

  const id = uuid.v4();
  const ciRequest: ContractInvokeRequest = {
    id: id,
    typ: PROTOCOL_CONSTANTS.MediaType.PlainMessage,
    type: PROTOCOL_CONSTANTS.PROTOCOL_MESSAGE_TYPE.CONTRACT_INVOKE_REQUEST_MESSAGE_TYPE,
    thid: id,
    body: ciRequestBody,
    from: verifierDID.string(),
    to: profileDID.string(),
  };

  const ciResponse = await contractRequestHandler.handle(ciRequest, options);

  return ciResponse;
}

export async function setZKPRequest_KYCAgeCredential(
  verifier: Contract,
  validatorAddress: string,
  groth16VerifierType: Groth16VerifierType,
  provider?: JsonRpcProvider,
  signer?: any,
): Promise<bigint> {
  console.log(
    `================= setRequest ${groth16VerifierType} KYCAgeCredential ===================`,
  );
  let chainId: number;
  let network: string;

  if (!signer) {
    const [signerHre] = await hre.ethers.getSigners();
    signer = signerHre;
  }
  console.log("Signer: ", signer.address);

  if (provider) {
    chainId = Number((await provider.getNetwork()).chainId);
    network = (await provider.getNetwork()).name;
  } else {
    chainId = 80002;
    network = hre.network.name;
  }

  const methodId = "06c86a91";

  const verifierId = buildVerifierId(await verifier.getAddress(), {
    blockchain: Blockchain.Privado,
    networkId: NetworkId.Main,
    method: DidMethod.Iden3,
  });

  // you can run https://go.dev/play/p/oB_oOW7kBEw to get schema hash and claimPathKey using YOUR schema
  const schemaBigInt = "74977327600848231385663280181476307657";

  // merklized path to field in the W3C credential according to JSONLD  schema e.g. birthday in the KYCAgeCredential under the url "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld"
  const schemaClaimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";

  let circuitId: string;
  switch (groth16VerifierType) {
    case "mtpV2":
      circuitId = CircuitId.AtomicQueryMTPV2OnChain;
      break;
    case "sigV2":
      circuitId = CircuitId.AtomicQuerySigV2OnChain;
      break;
    case "v3":
      circuitId = CircuitId.AtomicQueryV3OnChain;
      break;
    case "authV2":
      circuitId = CircuitId.AuthV2;
      break;
  }

  let dataKYCAgeCredential: string;

  let queryKYCAgeCredential: any = {
    schema: schemaBigInt,
    claimPathKey: schemaClaimPathKey,
    operator: Operators.NE,
    slotIndex: 0,
    queryHash: "",
    value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
    circuitIds: [circuitId],
    skipClaimRevocationCheck: false,
    claimPathNotExists: 0,
  };

  if (groth16VerifierType === "v3") {
    queryKYCAgeCredential = {
      ...queryKYCAgeCredential,
      allowedIssuers: [],
      verifierID: verifierId.bigInt(),
      nullifierSessionID: 11837215,
      groupID: 0,
      proofType: 0,
    };

    queryKYCAgeCredential.queryHash = calculateQueryHashV3(
      queryKYCAgeCredential.value.map((i) => BigInt(i)),
      queryKYCAgeCredential.schema,
      queryKYCAgeCredential.slotIndex,
      queryKYCAgeCredential.operator,
      queryKYCAgeCredential.claimPathKey,
      1, //queryKYCAgeCredential.value.length, // for operator LT it should be 1 for value
      1, // merklized
      queryKYCAgeCredential.skipClaimRevocationCheck ? 0 : 1,
      queryKYCAgeCredential.verifierID.toString(),
      queryKYCAgeCredential.nullifierSessionID,
    ).toString();

    dataKYCAgeCredential = packV3ValidatorParams(queryKYCAgeCredential);
  } else {
    queryKYCAgeCredential.queryHash = calculateQueryHashV2(
      queryKYCAgeCredential.value.map((i) => BigInt(i)),
      queryKYCAgeCredential.schema,
      queryKYCAgeCredential.slotIndex,
      queryKYCAgeCredential.operator,
      queryKYCAgeCredential.claimPathKey,
      queryKYCAgeCredential.claimPathNotExists,
    ).toString();

    dataKYCAgeCredential = packValidatorParams(queryKYCAgeCredential);
  }

  const requestId = calculateRequestID(dataKYCAgeCredential, await signer.getAddress());

  console.log(`Request ID to create: ${requestId}`);
  const requestIdExists = await verifier.requestIdExists(requestId);
  if (!requestIdExists) {
    const invokeRequestMetadataKYCAgeCredential = {
      id: "7f38a193-0918-4a48-9fac-36adfdb8b543",
      typ: "application/iden3comm-plain-json",
      type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
      thid: "7f38a193-0918-4a48-9fac-36adfdb8b543",
      from: DID.parseFromId(verifierId).string(),
      body: {
        reason: "for testing submitResponse",
        transaction_data: {
          contract_address: await verifier.getAddress(),
          method_id: methodId,
          chain_id: chainId,
          network: network,
        },
        scope: [
          {
            id: requestId.toString(),
            circuitId: queryKYCAgeCredential.circuitIds[0],
            query: {
              allowedIssuers:
                !queryKYCAgeCredential.allowedIssuers ||
                !queryKYCAgeCredential.allowedIssuers.length
                  ? ["*"]
                  : queryKYCAgeCredential.allowedIssuers,
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

    const tx = await verifier.setRequests(
      [
        {
          requestId: requestId.toString(),
          metadata: JSON.stringify(invokeRequestMetadataKYCAgeCredential),
          validator: validatorAddress,
          creator: await signer.getAddress(),
          params: dataKYCAgeCredential,
        },
      ],
      // {
      //   gasPrice: 50000000000,
      //   initialBaseFeePerGas: 25000000000,
      //   gasLimit: 10000000,
      // },
    );

    console.log(`Request ID: ${requestId} is set in tx ${tx.hash}`);
    await tx.wait();
  } else {
    console.log(`Request ID: ${requestId} already exists`);
  }
  return requestId; // Return the requestId for further use
}
