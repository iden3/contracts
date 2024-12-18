// HARDHAT network Oracle signing address
import { ethers } from "hardhat";

export const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";

const ORACLE_SIGNING_ADDRESS_HARDHAT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// TEST networks Oracle signing address (For now we will use in testnets the same production signing address)
export const ORACLE_SIGNING_ADDRESS_TEST = "0x3e1cFE1b83E7C1CdB0c9558236c1f6C7B203C34e";
// PRODUCTION networks Oracle signing address
export const ORACLE_SIGNING_ADDRESS_PRODUCTION = "0xf0Ae6D287aF14f180E1FAfe3D2CB62537D7b1A82";

type ChainIdInfo = {
  idType: string;
  networkType: string;
  oracleSigningAddress: string;
};

export const chainIdInfoMap: Map<number, ChainIdInfo> = new Map()
  .set(31337, {
    idType: "0x0112",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_HARDHAT,
  }) // hardhat
  .set(1101, {
    idType: "0x0114",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon zkevm
  .set(2442, {
    idType: "0x0115",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon cardona
  .set(137, {
    idType: "0x0111",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon main
  .set(80001, {
    idType: "0x0112",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon mumbai
  .set(80002, {
    idType: "0x0113",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon amoy
  .set(1, {
    idType: "0x0121",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // ethereum mainnet
  .set(11155111, {
    idType: "0x0123",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // ethereum sepolia
  .set(21000, {
    idType: "0x01A1",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // privado-main
  .set(21001, {
    idType: "0x01A2",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // privado-test
  .set(59144, {
    idType: "0x0149",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // linea-main
  .set(59141, {
    idType: "0x0148",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }); // linea-sepolia

export const networks = Object.freeze({
  PRIVADO_TEST: { name: "Privado Test", chainId: 21001 },
  PRIVADO_MAIN: { name: "Privado Main", chainId: 21000 },
  POLYGON_AMOY: { name: "Polygon Amoy", chainId: 80002 },
  POLYGON_MAINNET: { name: "Polygon Mainnet", chainId: 137 },
  ETHEREUM_SEPOLIA: { name: "Ethereum Sepolia", chainId: 11155111 },
  ETHEREUM_MAINNET: { name: "Ethereum Mainnet", chainId: 1 },
  ZKEVM_CARDONA: { name: "Zkevm Cardona", chainId: 2442 },
  ZKEVM_MAINNET: { name: "Zkevm Mainnet", chainId: 1101 },
  LINEA_SEPOLIA: { name: "Linea Sepolia", chainId: 59141 },
  LINEA_MAINNET: { name: "Linea Mainnet", chainId: 59144 },
});

export const STATE_ADDRESS_POLYGON_AMOY = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
export const STATE_ADDRESS_POLYGON_MAINNET = "0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D";

export const VALIDATOR_TYPES = Object.freeze({
  MTP_V2: "mtpV2",
  SIG_V2: "sigV2",
  V3: "v3",
  AUTH_V2: "authV2",
});

export const contractsInfo = Object.freeze({
  CREATE2_ADDRESS_ANCHOR: {
    name: "Create2AddressAnchor",
    unifiedAddress: "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
    create2Calldata: "",
  },
  UNIVERSAL_VERIFIER: {
    name: "UniversalVerifier",
    version: "1.1.5",
    unifiedAddress: "0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c",
    create2Calldata: ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.UniversalVerifier")),
    verificationOpts: {
      // For verifying the different contracts with proxy we need verification with different constructor arguments
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  STATE: {
    name: "State",
    version: "2.6.1",
    unifiedAddress: "0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896",
    create2Calldata: ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.State")),
    verificationOpts: {
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  VALIDATOR_SIG: {
    name: "CredentialAtomicQuerySigV2Validator",
    version: "2.1.1",
    unifiedAddress: "0x59B347f0D3dd4B98cc2E056Ee6C53ABF14F8581b",
    create2Calldata: ethers.hexlify(
      ethers.toUtf8Bytes("iden3.create2.CredentialAtomicQuerySigV2Validator"),
    ),
    verificationOpts: {
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  VALIDATOR_MTP: {
    name: "CredentialAtomicQueryMTPV2Validator",
    version: "2.1.1",
    unifiedAddress: "0x27bDFFCeC5478a648f89764E22fE415486A42Ede",
    create2Calldata: ethers.hexlify(
      ethers.toUtf8Bytes("iden3.create2.CredentialAtomicQueryMTPV2Validator"),
    ),
    verificationOpts: {
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  VALIDATOR_V3: {
    name: "CredentialAtomicQueryV3Validator",
    version: "2.1.1-beta.1",
    unifiedAddress: "0xd179f29d00Cd0E8978eb6eB847CaCF9E2A956336",
    create2Calldata: ethers.hexlify(
      ethers.toUtf8Bytes("iden3.create2.CredentialAtomicQueryV3Validator"),
    ),
    verificationOpts: {
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  VALIDATOR_AUTH_V2: {
    name: "AuthV2Validator",
    version: "1.0.0",
    unifiedAddress: "0x49ebdC163fa014F310CeDBc8e4a0b15C738D8073",
    create2Calldata: ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.AuthV2Validator")),
    verificationOpts: {
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  IDENTITY_TREE_STORE: {
    name: "IdentityTreeStore",
    version: "1.1.0",
    unifiedAddress: "0x7dF78ED37d0B39Ffb6d4D527Bb1865Bf85B60f81",
    create2Calldata: ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.IdentityTreeStore")),
    verificationOpts: {
      constructorArgsImplementation: [],
      constructorArgsProxy: [
        "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
        "0xae15d2023a76174a940cbb2b7f44012c728b9d74",
        "0x6964656e332e637265617465322e556e6976657273616c5665726966696572",
      ],
      constructorArgsProxyAdmin: ["0xAe15d2023A76174a940cbb2b7F44012C728B9d74"],
      libraries: {},
    },
  },
  VC_PAYMENT: {
    name: "VCPayment",
    version: "1.0.0",
    unifiedAddress: "",
    create2Calldata: ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.VCPayment")),
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  MC_PAYMENT: {
    name: "MCPayment",
    version: "1.0.0",
    unifiedAddress: "",
    create2Calldata: ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.MCPayment")),
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  CROSS_CHAIN_PROOF_VALIDATOR: {
    name: "CrossChainProofValidator",
    unifiedAddress: "",
    create2Calldata: "",
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  SMT_LIB: {
    name: "SmtLib",
    unifiedAddress: "0x682364078e26C1626abD2B95109D2019E241F0F6",
    create2Calldata: "",
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  POSEIDON_1: {
    name: "PoseidonUnit1L",
    unifiedAddress: "0xC72D76D7271924a2AD54a19D216640FeA3d138d9",
    create2Calldata: "",
  },
  POSEIDON_2: {
    name: "PoseidonUnit2L",
    unifiedAddress: "0x72F721D9D5f91353B505207C63B56cF3d9447edB",
    create2Calldata: "",
  },
  POSEIDON_3: {
    name: "PoseidonUnit3L",
    unifiedAddress: "0x5Bc89782d5eBF62663Df7Ce5fb4bc7408926A240",
    create2Calldata: "",
  },
  POSEIDON_4: {
    name: "PoseidonUnit4L",
    unifiedAddress: "0x0695cF2c6dfc438a4E40508741888198A6ccacC2",
    create2Calldata: "",
  },
  GROTH16_VERIFIER_STATE_TRANSITION: {
    name: "Groth16VerifierStateTransition",
    unifiedAddress: "",
    create2Calldata: "",
    verificationOpts: {
      contract:
        "contracts/lib/groth16-verifiers/Groth16VerifierStateTransition.sol:Groth16VerifierStateTransition",
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  GROTH16_VERIFIER_MTP: {
    name: "Groth16VerifierMTPWrapper",
    unifiedAddress: "",
    create2Calldata: "",
    verificationOpts: {
      contract:
        "contracts/lib/groth16-verifiers/Groth16VerifierMTPWrapper.sol:Groth16VerifierMTPWrapper",
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  GROTH16_VERIFIER_SIG: {
    name: "Groth16VerifierSigWrapper",
    unifiedAddress: "",
    create2Calldata: "",
    verificationOpts: {
      contract:
        "contracts/lib/groth16-verifiers/Groth16VerifierSigWrapper.sol:Groth16VerifierSigWrapper",
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  GROTH16_VERIFIER_V3: {
    name: "Groth16VerifierV3Wrapper",
    unifiedAddress: "",
    create2Calldata: "",
    verificationOpts: {
      contract:
        "contracts/lib/groth16-verifiers/Groth16VerifierV3Wrapper.sol:Groth16VerifierV3Wrapper",
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  GROTH16_VERIFIER_AUTH_V2: {
    name: "Groth16VerifierAuthV2Wrapper",
    unifiedAddress: "",
    create2Calldata: "",
    verificationOpts: {
      contract:
        "contracts/lib/groth16-verifiers/Groth16VerifierAuthV2Wrapper.sol:Groth16VerifierAuthV2Wrapper",
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  STATE_LIB: {
    name: "StateLib",
    unifiedAddress: "",
    create2Address: "",
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  STATE_CROSS_CHAIN_LIB: {
    name: "StateCrossChainLib",
    unifiedAddress: "",
    create2Address: "",
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  VERIFIER_LIB: {
    name: "VerifierLib",
    unifiedAddress: "",
    create2Address: "",
    verificationOpts: {
      constructorArgsImplementation: [],
      libraries: {},
    },
  },
  EMBEDDED_ZKP_VERIFIER_WRAPPER: {
    name: "EmbeddedZKPVerifierWrapper",
    unifiedAddress: "",
    create2Calldata: "",
  },
});

export const TEN_YEARS = 315360000;
