// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {RequestDisableable} from "../verifiers/RequestDisableable.sol";
import {IState} from "../interfaces/IState.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract RequestDisableableTestWrapper is RequestDisableable {
    function initialize(IState state) public initializer {
        __Verifier_init(state);
    }

    function disableRequest(uint256 requestId) public {
        _disableRequest(requestId);
    }

    function enableRequest(uint256 requestId) public {
        _enableRequest(requestId);
    }

    function testModifier(uint256 requestId) public view onlyEnabledRequest(requestId) {}

    function getRequestIfCanBeVerified(
        uint256 requestId
    ) public view returns (IVerifier.RequestData memory) {
        return _getRequestIfCanBeVerified(requestId);
    }
}
