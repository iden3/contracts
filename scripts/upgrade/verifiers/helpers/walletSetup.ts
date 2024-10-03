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

const circuitsFolder = "./circuits";

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
  circuitData: CircuitData,
  prepareFn: AuthDataPrepareFunc,
  stateVerificationFn: StateVerificationFunc,
): Promise<IPackageManager> {
  const authInputsHandler = new DataPrepareHandlerFunc(prepareFn);

  const verificationFn = new VerificationHandlerFunc(stateVerificationFn);
  const mapKey = proving.provingMethodGroth16AuthV2Instance.methodAlg.toString();
  const verificationParamMap: Map<string, VerificationParams> = new Map([
    [
      mapKey,
      {
        key: circuitData.verificationKey!,
        verificationFn,
      },
    ],
  ]);

  const provingParamMap: Map<string, ProvingParams> = new Map();
  provingParamMap.set(mapKey, {
    dataPreparer: authInputsHandler,
    provingKey: circuitData.provingKey!,
    wasm: circuitData.wasm!,
  });

  const mgr: IPackageManager = new PackageManager();
  const packer = new ZKPPacker(provingParamMap, verificationParamMap);
  const plainPacker = new PlainPacker();
  mgr.registerPackers([packer, plainPacker]);

  return mgr;
}
