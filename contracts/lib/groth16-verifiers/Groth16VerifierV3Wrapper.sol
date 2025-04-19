//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added require error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import "./Groth16VerifierV3.sol";
import "../../interfaces/IGroth16Verifier.sol";

error ExpectedArrayLenght(uint256 expected, uint256 actual);

contract Groth16VerifierV3Wrapper is Groth16VerifierV3, IGroth16Verifier {
    /**
     * @dev Number of public signals for atomic V3 circuit
     */
    uint256 constant PUBSIGNALS_LENGTH = 14;

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
        // slither-disable-next-line uninitialized-local
        uint[PUBSIGNALS_LENGTH] memory pubSignals;

        if (signals.length != PUBSIGNALS_LENGTH) {
            revert ExpectedArrayLenght(PUBSIGNALS_LENGTH, signals.length);
        }

        for (uint256 i = 0; i < PUBSIGNALS_LENGTH; i++) {
            pubSignals[i] = signals[i];
        }
        return this.verifyProof(a, b, c, pubSignals);
    }
}
