// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {Groth16VerifierLinkedMultiQuery10} from "./Groth16VerifierLinkedMultiQuery10.sol";

contract Groth16VerifierLinkedMultiQuery10Wrapper is
    Groth16VerifierLinkedMultiQuery10,
    IGroth16Verifier
{
    /**
     * @dev Number of public signals for atomic mtp circuit
     */
    uint constant PUBSIGNALS_LENGTH = 22;

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

        require(signals.length == PUBSIGNALS_LENGTH, "expected array length is 22");

        for (uint256 i = 0; i < PUBSIGNALS_LENGTH; i++) {
            pubSignals[i] = signals[i];
        }

        return this.verifyProof(a, b, c, pubSignals);
    }
}
