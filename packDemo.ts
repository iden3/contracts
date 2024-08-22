import { ethers } from "ethers";
import { GlobalStateUpdate, StateUpdate, CrossChainProof } from "./test/utils/packData";

const abiCoder = new ethers.AbiCoder();

// This data comes from Universal Resolvers

// Properties:

// didResolutionMetadata.proof.eip712.message
// didResolutionMetadata.proof.verificationMethod property:

// Requests examples:

// GET http://localhost:8080/1.0/identifiers/did:iden3:privado:test:2SoPJ7UQh3jFPLqf15N3z6rEYhzJ38N8DUemLN2KWS
//     ?signature=EthereumEip712Signature2021
//   &gist=0x0000000000000000000000000000000000000000000000000000000000000000

// GET https://resolver-dev.privado.id/1.0/identifiers/did:iden3:privado:test:2SoPJ7UQh3jFPLqf15N3z6rEYhzJ38N8DUemLN2KWS
//     ?signature=EthereumEip712Signature2021
//   &state=e500792b5d2401e3ff2277f26ebc04a3733d6b57ddb94e82612a8dfd18644c2b

const gsu: GlobalStateUpdate = {
  globalStateMsg: {
    timestamp: 1724323088n,
    userID: 19829108207309885047084260525570486092116576508054294263928858481001996801n,
    root: 0n,
    replacedAtTimestamp: 1722211019n,
  },
  signature:
    "0xdaf1cec29574d4441d5cea8706c8a85d83a17bbb932f5eb087920088718cfb9f056f1af4fd03c2f053549cf94add87456e707c5de45e770beaea8c74932cceac1b",
};

const su: StateUpdate = {
  idStateMsg: {
    timestamp: 1724323088n,
    userID: 19829108207309885047084260525570486092116576508054294263928858481001996801n,
    state: 0n,
    replacedAtTimestamp: 1722211019n,
  },
  signature:
    "0xdaf1cec29574d4441d5cea8706c8a85d83a17bbb932f5eb087920088718cfb9f056f1af4fd03c2f053549cf94add87456e707c5de45e770beaea8c74932cceac1b",
};

const crossChainProof = packCrossChainProofs([
  {
    proofType: "globalStateProof",
    proof: packGlobalStateUpdate(gsu),
  },
  {
    proofType: "stateProof",
    proof: packIdentityStateUpdate(su),
  },
]);

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

export function packCrossChainProofs(proofs: CrossChainProof[]): string {
  return abiCoder.encode(["tuple(" + "string proofType," + "bytes proof" + ")[]"], [proofs]);
}

console.log("CrossChainProof: ", crossChainProof);
