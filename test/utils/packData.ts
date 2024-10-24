import { ethers, Signer } from "ethers";

const abiCoder = new ethers.AbiCoder();

const domain = {
  name: "StateInfo",
  version: "1",
  chainId: 0,
  verifyingContract: ethers.ZeroAddress,
};

export type IdentityStateMessage = {
  timestamp: bigint;
  id: bigint;
  state: bigint;
  replacedAtTimestamp: bigint;
};

export type GlobalStateMessage = {
  timestamp: bigint;
  idType: string;
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
        "uint256 id," +
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
        "bytes2 idType," +
        "uint256 root," +
        "uint256 replacedAtTimestamp" +
        ") globalStateMsg," +
        "bytes signature," +
        ")",
    ],
    [msg],
  );
}

export async function packGlobalStateUpdateWithSignature(
  gsm: GlobalStateMessage,
  signer: Signer,
  tamperWithMessage: boolean = false,
  invalidSignature: boolean = false,
): Promise<string> {
  const types = {
    GlobalState: [
      { name: "timestamp", type: "uint256" },
      { name: "idType", type: "bytes2" },
      { name: "root", type: "uint256" },
      { name: "replacedAtTimestamp", type: "uint256" },
    ],
  };

  const gsu: GlobalStateUpdate = {
    globalStateMsg: gsm,
    signature: await signer.signTypedData(domain, types, gsm),
  };

  if (tamperWithMessage) {
    gsu.globalStateMsg.timestamp++;
  }
  if (invalidSignature) {
    gsu.signature = gsu.signature.slice(0, -5) + "00000";
  }
  return packGlobalStateUpdate(gsu);
}

export async function packIdentityStateUpdateWithSignature(
  ism: IdentityStateMessage,
  signer: Signer,
  tamperWithMessage: boolean = false,
  invalidSignature: boolean = false,
): Promise<string> {
  const types = {
    IdentityState: [
      { name: "timestamp", type: "uint256" },
      { name: "id", type: "uint256" },
      { name: "state", type: "uint256" },
      { name: "replacedAtTimestamp", type: "uint256" },
    ],
  };

  const isu: StateUpdate = {
    idStateMsg: ism,
    signature: await signer.signTypedData(domain, types, ism),
  };

  if (tamperWithMessage) {
    isu.idStateMsg.timestamp++;
  }
  if (invalidSignature) {
    isu.signature = isu.signature.slice(0, -5) + "00000";
  }
  return packIdentityStateUpdate(isu);
}

export function packZKProof(inputs: string[], a: string[], b: string[][], c: string[]): string {
  return abiCoder.encode(
    ["uint256[] inputs", "uint256[2]", "uint256[2][2]", "uint256[2]"],
    [inputs, a, b, c],
  );
}

export async function buildCrossChainProofs(
  crossChainProofsMessages: any[],
  signer: any,
): Promise<any[]> {
  const map = await Promise.all(
    crossChainProofsMessages.map(async (crossChainProofMessage) => {
      return crossChainProofMessage.idType
        ? {
            proofType: "globalStateProof",
            proof: await packGlobalStateUpdateWithSignature(crossChainProofMessage, signer),
          }
        : {
            proofType: "stateProof",
            proof: await packIdentityStateUpdateWithSignature(crossChainProofMessage, signer),
          };
    }),
  );
  return map;
}
