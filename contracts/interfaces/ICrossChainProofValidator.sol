// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IState} from "./IState.sol";
import {IState} from "./IState.sol";

/**
 * @dev ICrossChainProofValidator. Interface for cross chain proof validation.
 */
interface ICrossChainProofValidator {
    /**
     * @dev Verifies global state proof and signer
     * @param globalStateProof The global state proof
     * @return The result of the global state proof verification
     */
    function processGlobalStateProof(
        bytes calldata globalStateProof
    ) external returns (IState.GlobalStateProcessResult memory);

    /**
     * @dev Verifies identity state proof and signer
     * @param identityStateProof The identity state proof
     * @return The result of the identity state proof verification
     */
    function processIdentityStateProof(
        bytes calldata identityStateProof
    ) external returns (IState.IdentityStateProcessResult memory);
}
