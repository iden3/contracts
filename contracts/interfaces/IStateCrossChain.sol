// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IStateWithTimestampGetters} from "./IStateWithTimestampGetters.sol";

interface IStateCrossChain is IStateWithTimestampGetters {
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

    struct GlobalStateProcessResult {
        bytes2 idType;
        uint256 root;
        uint256 replacedAt;
    }

    struct IdentityStateProcessResult {
        uint256 id;
        uint256 state;
        uint256 replacedAt;
    }

    function processCrossChainProof(bytes calldata proof) external;
}
