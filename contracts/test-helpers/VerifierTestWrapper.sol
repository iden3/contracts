// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {Verifier} from "../verifiers/Verifier.sol";
import {IState} from "../interfaces/IState.sol";

contract VerifierTestWrapper is Verifier {
    function initialize(IState state) public initializer {
        __Verifier_init(state);
    }
}
