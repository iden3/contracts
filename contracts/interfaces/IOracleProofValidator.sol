// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IState} from "./IState.sol";
import {ICircuitValidator} from "./ICircuitValidator.sol";
import {IStateCrossChain} from "./IStateCrossChain.sol";

interface IOracleProofValidator {
    function verifyIdentityState(
        IStateCrossChain.IdentityStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    function verifyGlobalState(
        IStateCrossChain.GlobalStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);
}
