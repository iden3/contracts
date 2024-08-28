// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";

contract OracleProofValidatorStub is IOracleProofValidator {
    constructor(
        string memory domainName,
        string memory signatureVersion,
        address oracleSigningAddress
    ) {}

    function verifyIdentityState(
        IStateCrossChain.IdentityStateMessage calldata,
        bytes calldata
    ) external view override returns (bool) {
        return true;
    }

    function verifyGlobalState(
        IStateCrossChain.GlobalStateMessage calldata,
        bytes calldata
    ) external view override returns (bool) {
        return true;
    }
}
