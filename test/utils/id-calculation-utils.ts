import { ethers } from "hardhat";

export function calculateGroupID(requestIds: bigint[]): bigint {
  const types = Array(requestIds.length).fill("uint256");

  const groupID =
    BigInt(ethers.keccak256(ethers.solidityPacked(types, requestIds))) &
    BigInt("0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

  return groupID;
}

export function calculateRequestID(params: string, address: string): bigint {
  const requestId =
    (BigInt(ethers.keccak256(ethers.solidityPacked(["bytes", "address"], [params, address]))) &
      BigInt("0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")) +
    BigInt("0x0001000000000000000000000000000000000000000000000000000000000000");
  return requestId;
}
