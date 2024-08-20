// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IState} from "./IState.sol";

interface IOracleProofValidator {
    struct IdentityStateMessage {
        address from;
        uint256 timestamp;
        uint256 identity;
        uint256 state;
        uint256 replacedByState;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
    }

    struct GlobalStateMessage {
        address from;
        uint256 timestamp;
        uint256 root;
        uint256 replacedByRoot;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
    }

    struct IdentityStateUpdate {
        IdentityStateMessage idStateMsg;
        bytes signature;
    }

    struct GlobalStateUpdate {
        GlobalStateMessage globalStateMsg;
        bytes signature;
    }

    struct CrossChainProof {
        string proofType;
        bytes proof;
    }

    function verifyIdentityState(
        IdentityStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    function verifyGlobalState(
        GlobalStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    function processProof(
        bytes calldata proof
    ) external view returns (IState.GistRootInfo[] memory, IState.StateInfo[] memory);
}
