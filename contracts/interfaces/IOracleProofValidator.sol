// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IState} from "./IState.sol";
import {IState} from "./IState.sol";

interface IOracleProofValidator {
    function processGlobalStateProof(
        bytes calldata globalStateProof
    ) external returns (IState.GlobalStateProcessResult memory);

    function processIdentityStateProof(
        bytes calldata identityStateProof
    ) external returns (IState.IdentityStateProcessResult memory);
}
