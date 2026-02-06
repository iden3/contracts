import { randomBytes } from "crypto";
import { network } from "hardhat";

const { ethers } = await network.connect();

export function calculateGroupID(): bigint {
  const groupID =
    BigInt(ethers.keccak256(randomBytes(32))) &
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

export function calculateMultiRequestId(
  requestIds: bigint[],
  groupIds: bigint[],
  sender: string,
): bigint {
  return BigInt(
    ethers.keccak256(
      ethers.solidityPacked(["uint256[]", "uint256[]", "address"], [requestIds, groupIds, sender]),
    ),
  );
}
