// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Groth16VerifierAuthV2} from "./Groth16VerifierAuthV2.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";

contract Groth16VerifierAuthV2Wrapper is Groth16VerifierAuthV2, IGroth16Verifier {
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

        require(signals.length == PUBSIGNALS_LENGTH, "expected array length is 3");

        for (uint256 i = 0; i < PUBSIGNALS_LENGTH; i++) {
            pubSignals[i] = signals[i];
        }

        return this.verifyProof(a, b, c, pubSignals);
    }
}
