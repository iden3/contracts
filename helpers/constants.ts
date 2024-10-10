// HARDHAT network Oracle signing address
import { ethers } from "hardhat";

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
    idType: "0x0212",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_HARDHAT,
  }) // hardhat
  .set(1101, {
    idType: "0x0214",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon zkevm
  .set(2442, {
    idType: "0x0215",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon cardona
  .set(137, {
    idType: "0x0211",
    networkType: "main",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon main
  .set(80001, {
    idType: "0x0212",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon mumbai
  .set(80002, {
    idType: "0x0213",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // polygon amoy
  .set(11155111, {
    idType: "0x0223",
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

export const CONTRACT_NAMES = Object.freeze({
  UNIVERSAL_VERIFIER: "UniversalVerifier",
  STATE: "State",
  VALIDATOR_SIG: "CredentialAtomicQuerySigV2Validator",
  VALIDATOR_MTP: "CredentialAtomicQueryMTPV2Validator",
  VALIDATOR_V3: "CredentialAtomicQueryV3Validator",
  IDENTITY_TREE_STORE: "IdentityTreeStore",
  VC_PAYMENT: "VCPayment",
  CROSS_CHAIN_PROOF_VALIDATOR: "CrossChainProofValidator",
  SMT_LIB: "SmtLib",
  POSEIDON_1: "PoseidonUnit1L",
  POSEIDON_2: "PoseidonUnit2L",
  POSEIDON_3: "PoseidonUnit3L",
});

export const NETWORK_NAMES = Object.freeze({
  PRIVADO_TEST: "Privado Test",
  PRIVADO_MAIN: "Privado Main",
  POLYGON_AMOY: "Polygon Amoy",
  POLYGON_MAINNET: "Polygon Mainnet",
  ETHEREUM_SEPOLIA: "Ethereum Sepolia",
  ETHEREUM_MAINNET: "Ethereum Mainnet",
  ZKEVM_CARDONA: "Zkevm Cardona",
  ZKEVM_MAINNET: "Zkevm Mainnet",
  LINEA_SEPOLIA: "Linea Sepolia",
  LINEA_MAINNET: "Linea Mainnet",
});

export const STATE_ADDRESS_POLYGON_AMOY = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
export const STATE_ADDRESS_POLYGON_MAINNET = "0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D";

export const UNIFIED_CONTRACT_ADDRESSES = Object.freeze({
  STATE: "0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896",
  SMT_LIB: "0x682364078e26C1626abD2B95109D2019E241F0F6",
  POSEIDON_1: "0xC72D76D7271924a2AD54a19D216640FeA3d138d9",
  POSEIDON_2: "0x72F721D9D5f91353B505207C63B56cF3d9447edB",
  POSEIDON_3: "0x5Bc89782d5eBF62663Df7Ce5fb4bc7408926A240",
  VALIDATOR_MTP: "0x27bDFFCeC5478a648f89764E22fE415486A42Ede",
  VALIDATOR_SIG: "0x59B347f0D3dd4B98cc2E056Ee6C53ABF14F8581b",
  VALIDATOR_V3: "0xd179f29d00Cd0E8978eb6eB847CaCF9E2A956336",
  UNIVERSAL_VERIFIER: "0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c",
  IDENTITY_TREE_STORE: "0x7dF78ED37d0B39Ffb6d4D527Bb1865Bf85B60f81",
});

export const VALIDATOR_TYPES = Object.freeze({
  MTP_V2: "mtpV2",
  SIG_V2: "sigV2",
  V3: "v3",
});

export const create2AddressesInfo: {
  anchorAddress: string;
  contractsCalldataMap: Map<string, string>;
} = {
  anchorAddress: "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
  contractsCalldataMap: new Map()
    .set(CONTRACT_NAMES.STATE, ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.State")))
    .set(
      CONTRACT_NAMES.UNIVERSAL_VERIFIER,
      ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.UniversalVerifier")),
    )
    .set(
      CONTRACT_NAMES.VALIDATOR_SIG,
      ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.CredentialAtomicQuerySigV2Validator")),
    )
    .set(
      CONTRACT_NAMES.VALIDATOR_MTP,
      ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.CredentialAtomicQueryMTPV2Validator")),
    )
    .set(
      CONTRACT_NAMES.VALIDATOR_V3,
      ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.CredentialAtomicQueryV3Validator")),
    )
    .set(
      CONTRACT_NAMES.IDENTITY_TREE_STORE,
      ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.IdentityTreeStore")),
    )
    .set(CONTRACT_NAMES.VC_PAYMENT, ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.VCPayment"))),
};
