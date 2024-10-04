// HARDHAT network Oracle signing address
import { ethers } from "hardhat";

const oracleSAHardhat = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// TEST networks Oracle signing address
const oracleSATest = "0x3e1cFE1b83E7C1CdB0c9558236c1f6C7B203C34e";
// PRODUCTION networks Oracle signing address
const oracleSAProd = "0xf0Ae6D287aF14f180E1FAfe3D2CB62537D7b1A82";

type ChainIdInfo = {
  idType: string;
  networkType: string;
  oracleSigningAddress: string;
};

export const chainIdInfoMap: Map<number, ChainIdInfo> = new Map()
  .set(31337, { idType: "0x0212", networkType: "test", oracleSigningAddress: oracleSAHardhat }) // hardhat
  .set(1101, { idType: "0x0214", networkType: "main", oracleSigningAddress: oracleSAProd }) // polygon zkevm
  .set(2442, { idType: "0x0215", networkType: "test", oracleSigningAddress: oracleSATest }) // polygon cardona
  .set(137, { idType: "0x0211", networkType: "main", oracleSigningAddress: oracleSAProd }) // polygon main
  .set(80001, { idType: "0x0212", networkType: "test", oracleSigningAddress: oracleSATest }) // polygon mumbai
  .set(80002, { idType: "0x0213", networkType: "test", oracleSigningAddress: oracleSATest }) // polygon amoy
  .set(11155111, { idType: "0x0223", networkType: "test", oracleSigningAddress: oracleSATest }) // ethereum sepolia
  .set(21000, { idType: "0x01A1", networkType: "main", oracleSigningAddress: oracleSAProd }) // privado-main
  .set(21001, { idType: "0x01A2", networkType: "test", oracleSigningAddress: oracleSATest }) // privado-test
  .set(59144, { idType: "0x0149", networkType: "main", oracleSigningAddress: oracleSAProd }) // linea-main
  .set(59141, { idType: "0x0148", networkType: "test", oracleSigningAddress: oracleSATest }); // linea-sepolia

export const CONTRACT_NAMES = Object.freeze({
  UNIVERSAL_VERIFIER: "UniversalVerifier",
  STATE: "State",
  VALIDATOR_SIG: "CredentialAtomicQuerySigV2Validator",
  VALIDATOR_MTP: "CredentialAtomicQueryMTPV2Validator",
  VALIDATOR_V3: "CredentialAtomicQueryV3Validator",
  IDENTITY_TREE_STORE: "IdentityTreeStore",
  VC_PAYMENT: "VCPayment",
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
