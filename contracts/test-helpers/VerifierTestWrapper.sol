// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import {Verifier} from "../verifiers/Verifier.sol";
import {IState} from "../interfaces/IState.sol";

contract VerifierTestWrapper is Verifier {
    function initialize(IState state) public initializer {
        __Verifier_init(state);
    }

    function setVerifierID(uint256 verifierID) public {
        _setVerifierID(verifierID);
    }
}
