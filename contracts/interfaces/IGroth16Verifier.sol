// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

/**
 * @dev IGroth16Verifier. Interface for verification of groth16 proofs.
 */
interface IGroth16Verifier {
    /**
     * @dev Verify the circuit with the groth16 proof π=([πa]1,[πb]2,[πc]1).
     * @param a πa element of the groth16 proof.
     * @param b πb element of the groth16 proof.
     * @param c πc element of the groth16 proof.
     * @param signals Public inputs and outputs of the circuit.
     * @return r true if the proof is verified.
     */
    function verify(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata signals
    ) external view returns (bool r);
}
