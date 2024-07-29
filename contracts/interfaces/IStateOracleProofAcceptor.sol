// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IdentityStateMessage, GlobalStateMessage} from "./IOracleProofValidator.sol";

interface IStateOracleProofAcceptor {
    function setStateInfo(IdentityStateMessage calldata message, bytes calldata signature) external;

    function setGistRootInfo(
        GlobalStateMessage calldata message,
        bytes calldata signature
    ) external;
}
