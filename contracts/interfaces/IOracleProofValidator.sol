// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IState} from "./IState.sol";
import {IStateCrossChain} from "./IStateCrossChain.sol";

interface IOracleProofValidator {
    /**
     * @dev Verifies the signature of an identity state message.
     * @param message The message with Identity State info
     * @param signature The signature to verify
     * @return true if the signature is valid, false otherwise
     **/
    function verifyIdentityState(
        IStateCrossChain.IdentityStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);

    /**
     * @dev Verifies the signature of an identity state message.
     * @param message The message with Global State info
     * @param signature The signature to verify
     * @return true if the signature is valid, false otherwise
     **/
    function verifyGlobalState(
        IStateCrossChain.GlobalStateMessage calldata message,
        bytes calldata signature
    ) external view returns (bool);
}
