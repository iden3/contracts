// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

/**
 * @dev IStateTransitionVerifier. Interface for groth16 state transition proof verification.
 */
interface IStateTransitionVerifier {
    /**
     * @dev Verify the state transition circuit with the groth16 proof π=([πa]1,[πb]2,[πc]1).
     * @param a πa element of the groth16 proof.
     * @param b πb element of the groth16 proof.
     * @param c πc element of the groth16 proof.
     * @param input Public inputs of the state transition circuit.
     * @return r true if the verification is passed.
     */
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external view returns (bool r);
}
