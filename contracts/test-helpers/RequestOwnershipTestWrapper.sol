// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import {RequestOwnership} from "../verifiers/RequestOwnership.sol";
import {IState} from "../interfaces/IState.sol";

contract RequestOwnershipTestWrapper is RequestOwnership {
    function initialize(IState state) public initializer {
        __Verifier_init(state);
    }

    function setRequestOwner(uint256 requestId, address requestOwner) public {
        _setRequestOwner(requestId, requestOwner);
    }
}
