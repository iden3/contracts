// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IState} from "./IState.sol";
import {IState} from "./IState.sol";

interface ICrossChainProofValidator {
    function processGlobalStateProof(
        bytes calldata globalStateProof
    ) external returns (IState.GlobalStateProcessResult memory);

    function processIdentityStateProof(
        bytes calldata identityStateProof
    ) external returns (IState.IdentityStateProcessResult memory);
}
