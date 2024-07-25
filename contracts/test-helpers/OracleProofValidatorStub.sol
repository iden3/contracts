// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IOracleProofValidator, IdentityStateMessage, GlobalStateMessage} from "../interfaces/IOracleProofValidator.sol";

contract OracleProofValidatorStub is IOracleProofValidator {
    function verifyIdentityState(
        IdentityStateMessage calldata message,
        bytes calldata signature
    ) public view virtual returns (bool) {
        return true;
    }

    function verifyGlobalState(
        GlobalStateMessage calldata message,
        bytes calldata signature
    ) public view virtual returns (bool) {
        return true;
    }
}
