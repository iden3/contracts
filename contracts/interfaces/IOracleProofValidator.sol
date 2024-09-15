// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IState} from "./IState.sol";
import {IStateCrossChain} from "./IStateCrossChain.sol";

interface IOracleProofValidator {
    function processGlobalStateProof(
        bytes calldata globalStateProof
    ) external returns (IStateCrossChain.GlobalStateProcessResult memory);

    function processIdentityStateProof(
        bytes calldata identityStateProof
    ) external returns (IStateCrossChain.IdentityStateProcessResult memory);
}
