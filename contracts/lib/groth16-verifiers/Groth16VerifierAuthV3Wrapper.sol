// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Groth16VerifierAuthV3} from "./Groth16VerifierAuthV3.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";

error ExpectedArrayLength(uint256 expected, uint256 actual);

contract Groth16VerifierAuthV3Wrapper is Groth16VerifierAuthV3, IGroth16Verifier {
    /**
     * @dev Number of public signals for atomic mtp circuit
     */
    uint256 constant PUBSIGNALS_LENGTH = 3;

    /**
     * @dev Verify the circuit with the groth16 proof π=([πa]1,[πb]2,[πc]1).
     * @param a πa element of the groth16 proof.
     * @param b πb element of the groth16 proof.
     * @param c πc element of the groth16 proof.
     * @param signals Public inputs and outputs of the circuit.
     * @return r true if the proof is valid.
     */
    function verify(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata signals
    ) public view returns (bool r) {
        uint[PUBSIGNALS_LENGTH] memory pubSignals;

        if (signals.length != PUBSIGNALS_LENGTH) {
            revert ExpectedArrayLength(PUBSIGNALS_LENGTH, signals.length);
        }

        for (uint256 i = 0; i < PUBSIGNALS_LENGTH; i++) {
            pubSignals[i] = signals[i];
        }

        return this.verifyProof(a, b, c, pubSignals);
    }
}
