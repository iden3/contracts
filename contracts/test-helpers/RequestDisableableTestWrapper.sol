// SPDX-License-Identifier: GPL-3.0
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

    /* solhint-disable no-empty-blocks */
    function testModifier(uint256 requestId) public view onlyEnabledRequest(requestId) {}
    /* solhint-enable no-empty-blocks */

    function getRequestIfCanBeVerified(
        uint256 requestId
    ) public view returns (IVerifier.RequestData memory) {
        return _getRequestIfCanBeVerified(requestId);
    }
}
