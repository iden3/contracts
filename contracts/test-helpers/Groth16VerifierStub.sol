// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IStateTransitionVerifier} from "../interfaces/IStateTransitionVerifier.sol";

contract Groth16VerifierStub is IStateTransitionVerifier {
    function verifyProof(
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory,
        uint256[4] memory
    ) external pure returns (bool r) {
        return true;
    }
}
