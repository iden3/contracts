// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStateCrossChainProofProcessor {
    struct IdentityStateUpdate {
        IdentityStateMessage idStateMsg;
        bytes signature;
    }

    struct GlobalStateUpdate {
        GlobalStateMessage globalStateMsg;
        bytes signature;
    }

    struct IdentityStateMessage {
        uint256 timestamp;
        uint256 id;
        uint256 state;
        uint256 replacedAtTimestamp;
    }

    struct GlobalStateMessage {
        uint256 timestamp;
        bytes2 idType;
        uint256 root;
        uint256 replacedAtTimestamp;
    }

    struct CrossChainProof {
        string proofType;
        bytes proof;
    }

    function processProof(bytes calldata proof) external;
}