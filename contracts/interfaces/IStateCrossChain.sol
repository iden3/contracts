// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IdentityStateMessage, GlobalStateMessage} from "./IOracleProofValidator.sol";

interface IStateCrossChain {
    function processProof(bytes calldata proof) external;
}
