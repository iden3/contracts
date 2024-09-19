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
  .set(1101, { idType: "0x0231", networkType: "main", oracleSigningAddress: oracleSAProd }) // zkEVM
  .set(2442, { idType: "0x0232", networkType: "test", oracleSigningAddress: oracleSATest }) // zkEVM testnet
  .set(137, { idType: "0x0211", networkType: "main", oracleSigningAddress: oracleSAProd }) // polygon main
  .set(80001, { idType: "0x0212", networkType: "test", oracleSigningAddress: oracleSATest }) // polygon mumbai
  .set(80002, { idType: "0x0213", networkType: "test", oracleSigningAddress: oracleSATest }) // polygon amoy
  .set(11155111, { idType: "0x0223", networkType: "test", oracleSigningAddress: oracleSATest }) // ethereum sepolia
  .set(21000, { idType: "0x01A1", networkType: "main", oracleSigningAddress: oracleSAProd }) // privado-main
  .set(21001, { idType: "0x01A2", networkType: "test", oracleSigningAddress: oracleSATest }) // privado-test
  .set(59144, { idType: "0x0149", networkType: "main", oracleSigningAddress: oracleSAProd }) // linea-main
  .set(59141, { idType: "0x0148", networkType: "test", oracleSigningAddress: oracleSATest }); // linea-sepolia

export const create2AddressesInfo:{
  anchorAddress: string;
  contractsCalldataMap: Map<string, string>;
} = {
  anchorAddress: "0x56fF81aBB5cdaC478bF236db717e4976b2ff841e",
  contractsCalldataMap: new Map()
  .set("State", ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.State"))),
};
