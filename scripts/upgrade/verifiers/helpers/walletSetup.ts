/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { proving } from "@iden3/js-jwz";
import {
  BjjProvider,
  CredentialStorage,
  CredentialWallet,
  defaultEthConnectionConfig,
  EthStateStorage,
  ICredentialWallet,
  IDataStorage,
  Identity,
  IdentityStorage,
  IdentityWallet,
  IIdentityWallet,
  InMemoryDataSource,
  InMemoryMerkleTreeStorage,
  InMemoryPrivateKeyStore,
  KMS,
  KmsKeyType,
  Profile,
  W3CCredential,
  EthConnectionConfig,
  CircuitData,
  IStateStorage,
  ProofService,
  ICircuitStorage,
  CredentialStatusType,
  CredentialStatusResolverRegistry,
  IssuerResolver,
  RHSResolver,
  AuthDataPrepareFunc,
  StateVerificationFunc,
  DataPrepareHandlerFunc,
  VerificationHandlerFunc,
  IPackageManager,
  VerificationParams,
  ProvingParams,
  ZKPPacker,
  PlainPacker,
  PackageManager,
  AgentResolver,
  FSCircuitStorage,
  AbstractPrivateKeyStore,
  CredentialStatusPublisherRegistry,
  Iden3SmtRhsCredentialStatusPublisher,
} from "@0xpolygonid/js-sdk";
import path from "path";

const __dirname = path.resolve();
const circuitsFolder = "./scripts/upgrade/verifiers/helpers/circuits"; //"./circuits";

export function initInMemoryDataStorage(
  configs: {
    contractAddress: string;
    rpcUrl: string;
    chainId: number;
  }[],
): IDataStorage {
  const conf: EthConnectionConfig[] = []; //[defaultEthConnectionConfig];

  for (const config of configs) {
    const conftemp: EthConnectionConfig = { ...defaultEthConnectionConfig };
    conftemp.contractAddress = config.contractAddress;
    conftemp.url = config.rpcUrl;
    conftemp.chainId = config.chainId;

    conf.push(conftemp);
  }

  // change here priority fees in case transaction is stuck or processing too long
  // conf.maxPriorityFeePerGas = '250000000000' - 250 gwei
  // conf.maxFeePerGas = '250000000000' - 250 gwei

  const dataStorage = {
    credential: new CredentialStorage(new InMemoryDataSource<W3CCredential>()),
    identity: new IdentityStorage(
      new InMemoryDataSource<Identity>(),
      new InMemoryDataSource<Profile>(),
    ),
    mt: new InMemoryMerkleTreeStorage(40),

    states: new EthStateStorage(conf),
  };

  return dataStorage;
}

export async function initIdentityWallet(
  dataStorage: IDataStorage,
  credentialWallet: ICredentialWallet,
  keyStore: AbstractPrivateKeyStore,
): Promise<IIdentityWallet> {
  const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, keyStore);
  const kms = new KMS();
  kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

  const credentialStatusPublisherRegistry = new CredentialStatusPublisherRegistry();
  credentialStatusPublisherRegistry.register(
    CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    new Iden3SmtRhsCredentialStatusPublisher(),
  );

  return new IdentityWallet(kms, dataStorage, credentialWallet, {
    credentialStatusPublisherRegistry,
  });
}

export async function initInMemoryDataStorageAndWallets(
  configs: {
    contractAddress: string;
    rpcUrl: string;
    chainId: number;
  }[],
) {
  const dataStorage = initInMemoryDataStorage(configs);
  const credentialWallet = await initCredentialWallet(dataStorage);
  const memoryKeyStore = new InMemoryPrivateKeyStore();

  const identityWallet = await initIdentityWallet(dataStorage, credentialWallet, memoryKeyStore);

  return {
    dataStorage,
    credentialWallet,
    identityWallet,
  };
}

export async function initCredentialWallet(dataStorage: IDataStorage): Promise<CredentialWallet> {
  const resolvers = new CredentialStatusResolverRegistry();
  resolvers.register(CredentialStatusType.SparseMerkleTreeProof, new IssuerResolver());
  resolvers.register(
    CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    new RHSResolver(dataStorage.states),
  );
  /* resolvers.register(
    CredentialStatusType.Iden3OnchainSparseMerkleTreeProof2023,
    new OnChainResolver([defaultEthConnectionConfig])
  );*/
  resolvers.register(CredentialStatusType.Iden3commRevocationStatusV1, new AgentResolver());

  return new CredentialWallet(dataStorage, resolvers);
}

export async function initCircuitStorage(): Promise<ICircuitStorage> {
  return new FSCircuitStorage({
    dirname: path.join(__dirname, circuitsFolder),
  });
}
export async function initProofService(
  identityWallet: IIdentityWallet,
  credentialWallet: ICredentialWallet,
  stateStorage: IStateStorage,
  circuitStorage: ICircuitStorage,
): Promise<ProofService> {
  return new ProofService(identityWallet, credentialWallet, circuitStorage, stateStorage, {
    ipfsGatewayURL: "https://ipfs-proxy-cache.privado.id",
  });
}

export async function initPackageManager(
  circuitDataAuthV2: CircuitData,
  circuitDataAuthV3: CircuitData,
  circuitDataAuthV3_8_32: CircuitData,
  prepareFn: AuthDataPrepareFunc,
  stateVerificationFn: StateVerificationFunc,
): Promise<IPackageManager> {
  const authInputsHandler = new DataPrepareHandlerFunc(prepareFn);

  const verificationFn = new VerificationHandlerFunc(stateVerificationFn);
  const mapKeyAuthV2 = proving.provingMethodGroth16AuthV2Instance.methodAlg.toString();
  const verificationParamMapAuthV2: Map<string, VerificationParams> = new Map([
    [
      mapKeyAuthV2,
      {
        key: circuitDataAuthV2.verificationKey!,
        verificationFn,
      },
    ],
  ]);

  const provingParamMapAuthV2: Map<string, ProvingParams> = new Map();
  provingParamMapAuthV2.set(mapKeyAuthV2, {
    dataPreparer: authInputsHandler,
    provingKey: circuitDataAuthV2.provingKey!,
    wasm: circuitDataAuthV2.wasm!,
  });

  const mapKeyAuthV3 = proving.provingMethodGroth16AuthV3Instance.methodAlg.toString();
  const verificationParamMapAuthV3: Map<string, VerificationParams> = new Map([
    [
      mapKeyAuthV3,
      {
        key: circuitDataAuthV3.verificationKey!,
        verificationFn,
      },
    ],
  ]);

  const provingParamMapAuthV3: Map<string, ProvingParams> = new Map();
  provingParamMapAuthV3.set(mapKeyAuthV3, {
    dataPreparer: authInputsHandler,
    provingKey: circuitDataAuthV3.provingKey!,
    wasm: circuitDataAuthV3.wasm!,
  });

  const mapKeyAuthV3_8_32 = proving.provingMethodGroth16AuthV3_8_32Instance.methodAlg.toString();
  const verificationParamMapAuthV3_8_32: Map<string, VerificationParams> = new Map([
    [
      mapKeyAuthV3_8_32,
      {
        key: circuitDataAuthV3_8_32.verificationKey!,
        verificationFn,
      },
    ],
  ]);

  const provingParamMapAuthV3_8_32: Map<string, ProvingParams> = new Map();
  provingParamMapAuthV3_8_32.set(mapKeyAuthV3_8_32, {
    dataPreparer: authInputsHandler,
    provingKey: circuitDataAuthV3_8_32.provingKey!,
    wasm: circuitDataAuthV3_8_32.wasm!,
  });

  const mgr: IPackageManager = new PackageManager();
  const packerAuthV2 = new ZKPPacker(provingParamMapAuthV2, verificationParamMapAuthV2);
  const packerAuthV3 = new ZKPPacker(provingParamMapAuthV3, verificationParamMapAuthV3);
  const packerAuthV3_8_32 = new ZKPPacker(
    provingParamMapAuthV3_8_32,
    verificationParamMapAuthV3_8_32,
  );
  const plainPacker = new PlainPacker();
  mgr.registerPackers([packerAuthV2, packerAuthV3, packerAuthV3_8_32, plainPacker]);

  return mgr;
}
