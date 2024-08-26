// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IState} from "./IState.sol";
import {ICircuitValidator} from "./ICircuitValidator.sol";
import {IStateCrossChainProofProcessor} from "./IStateCrossChainProofProcessor.sol";

interface IOracleProofValidator {
    function verifyIdentityState(
        IStateCrossChainProofProcessor.IdentityStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    function verifyGlobalState(
        IStateCrossChainProofProcessor.GlobalStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);
}
