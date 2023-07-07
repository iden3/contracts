// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {IStateTransitionVerifier} from "../interfaces/IStateTransitionVerifier.sol";

contract VerifierStub is IStateTransitionVerifier {
    /* solhint-disable no-unused-vars */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) external pure returns (bool r) {
        return true;
    }
    /* solhint-disable no-unused-vars */
}
