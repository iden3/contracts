// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IState} from "./IState.sol";
import {ICircuitValidator} from "./ICircuitValidator.sol";

interface IOracleProofValidator {
    struct IdentityStateUpdate {
        ICircuitValidator.IdentityStateMessage idStateMsg;
        bytes signature;
    }

    struct GlobalStateUpdate {
        ICircuitValidator.GlobalStateMessage globalStateMsg;
        bytes signature;
    }

    struct CrossChainProof {
        string proofType;
        bytes proof;
    }

    function verifyIdentityState(
        ICircuitValidator.IdentityStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    function verifyGlobalState(
        ICircuitValidator.GlobalStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    function processProof(
        bytes calldata proof
    )
        external
        view
        returns (
            ICircuitValidator.GlobalStateMessage[] memory,
            ICircuitValidator.IdentityStateMessage[] memory
        );
}
