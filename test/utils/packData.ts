import { ethers } from "ethers";

const abiCoder = new ethers.AbiCoder();

export type IdentityStateMessage = {
  timestamp: bigint;
  userID: bigint;
  state: bigint;
  replacedAtTimestamp: bigint;
};

export type GlobalStateMessage = {
  timestamp: bigint;
  userID: bigint;
  root: bigint;
  replacedAtTimestamp: bigint;
};

export type StateUpdate = {
  idStateMsg: IdentityStateMessage;
  signature: string;
};

export type GlobalStateUpdate = {
  globalStateMsg: GlobalStateMessage;
  signature: string;
};

export type Metadata = {
  key: string;
  value: string;
};

export type CrossChainProof = {
  proofType: string;
  proof: string;
};

export function packCrossChainProofs(proofs: CrossChainProof[]): string {
  return abiCoder.encode(["tuple(" + "string proofType," + "bytes proof" + ")[]"], [proofs]);
}

export function packIdentityStateUpdate(msg: StateUpdate): string {
  return abiCoder.encode(
    [
      "tuple(" +
        "tuple(" +
        "uint256 timestamp," +
        "uint256 userID," +
        "uint256 state," +
        "uint256 replacedAtTimestamp" +
        ") idStateMsg," +
        "bytes signature," +
        ")",
    ],
    [msg],
  );
}

export function packGlobalStateUpdate(msg: GlobalStateUpdate): string {
  return abiCoder.encode(
    [
      "tuple(" +
        "tuple(" +
        "uint256 timestamp," +
        "uint256 userID," +
        "uint256 root," +
        "uint256 replacedAtTimestamp" +
        ") globalStateMsg," +
        "bytes signature," +
        ")",
    ],
    [msg],
  );
}

export function packMetadatas(metas: Metadata[]): string {
  return abiCoder.encode(["tuple(" + "string key," + "bytes value" + ")[]"], [metas]);
}

// const res2 = packCrossChainProofs([
//   {
//     proofType: "globalStateProof",
//     proof: packGlobalStateMsg({
//       globalStateMsg: {
//         from: "0x615031554479128d65f30Ffa721791D6441d9727",
//         timestamp: 1722003509,
//         root: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
//         replacedByRoot: 0n,
//         createdAtTimestamp: 1722000063,
//         replacedAtTimestamp: 0,
//       },
//       signature:
//         "0x4ae1511455ec833ce709854aa7d9fad3d1bdc703659cc039a8c7df5febbe8e3774d1a7f06e30ec0391669e33d64db76766ed0bc2dbbbc36bbbc36535ee295ee295",
//     }),
//   },
//   {
//     proofType: "identityStateProof",
//     proof: packIdentityStateMsg({
//       idStateMsg: {
//         from: "0x615031554479128d65f30Ffa721791D6441d9727",
//         timestamp: 1722003509,
//         identity: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
//         state: 13704162472154210473949595093402377697496480870900777124562670166655890846618n,
//         replacedByState: 0n,
//         createdAtTimestamp: 1722000063,
//         replacedAtTimestamp: 0,
//       },
//       signature:
//         "0x4ae1511455ec833ce709854aa7d9fad3d1bdc703659cc039a8c7df5febbe8e3774d1a7f06e30ec0391669e33d64db76766ed0bc2dbbbc36535ee2955ee2955ee22",
//     }),
//   },
//   {
//     proofType: "identityStateProof",
//     proof: packIdentityStateMsg({
//       idStateMsg: {
//         from: "0x615031554479128d65f30Ffa721791D6441d9727",
//         timestamp: 1722003509,
//         identity: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
//         state: 13704162472154210473949595093402377697496480870900777124562670166655890846618n,
//         replacedByState: 0n,
//         createdAtTimestamp: 1722000063,
//         replacedAtTimestamp: 0,
//       },
//       signature:
//         "0x4ae1511455ec833ce709854aa7d9fad3d1bdc703659cc039a8c7df5febbe8e3774d1a7f06e30ec0391669e33d64db76766ed0bc2dbbbc36535ee295e3599c9a71c",
//     }),
//   },
// ]);
//
// console.log("\npackCrossChainProofs:");
// console.log(res2);
// console.log("data length:", res2.length / 2 - 2);
// console.log("Approximate gas cost:", (res2.length / 2 - 2) * 16);
//
// const res3 = packMetadatas([
//   {
//     key: "someKey",
//     value: "0x4ae1511455ec833ce709854aa7d9",
//   },
//   {
//     key: "someKey2",
//     value: "0x4ae1511455ec833ce709854aa7d9",
//   },
// ]);
//
// console.log("\npackMetadatas:");
// console.log(res3);
// console.log("data length:", res3.length / 2 - 2);
// console.log("Approximate gas cost:", (res3.length / 2 - 2) * 16);

//        (uint256[] memory inputs, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c)
//             = abi.decode(zkProof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

export function packZKProof(inputs: string[], a: string[], b: string[][], c: string[]): string {
  return abiCoder.encode(
    ["uint256[] inputs", "uint256[2]", "uint256[2][2]", "uint256[2]"],
    [inputs, a, b, c],
  );
}

// const res4 = packZKProof(
//   [
//     "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3",
//     "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3",
//     "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3",
//   ],
//   ["0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3", "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3"],
//   [
//     ["0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3", "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3"],
//     ["0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3", "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3"],
//   ],
//   ["0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3", "0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3"],
// );
//
// console.log("\npackZKProof:");
// console.log(res4);
// console.log("data length:", res4.length / 2 - 2);
// console.log("Approximate gas cost:", (res4.length / 2 - 2) * 16);
