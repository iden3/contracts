// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {ValidatorWhitelist} from "../verifiers/ValidatorWhitelist.sol";
import {IState} from "../interfaces/IState.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract ValidatorWhitelistTestWrapper is ValidatorWhitelist {
    function initialize(IState state) public initializer {
        __Verifier_init(state);
    }

    function addValidatorToWhitelist(IRequestValidator validator) public {
        _addValidatorToWhitelist(validator);
    }

    function removeValidatorFromWhitelist(IRequestValidator validator) public {
        _removeValidatorFromWhitelist(validator);
    }

    function testModifier(
        IRequestValidator validator
    ) public view onlyWhitelistedValidator(validator) {}

    function getRequestIfCanBeVerified(
        uint256 requestId
    ) public view returns (IVerifier.RequestData memory) {
        return _getRequestIfCanBeVerified(requestId);
    }
}
