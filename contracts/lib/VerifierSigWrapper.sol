//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "./VerifierSig.sol";
import "../interfaces/IVerifier.sol";

contract VerifierSigWrapper is VerifierSig, IVerifier {
    /**
     * @dev Number of public signals for atomic sig circuit
     */
    uint constant PUBSIGNALS_LENGTH = 11;

    /// @return r  bool true if proof is valid
    function verify(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata input
    ) public view returns (bool r) {
        // slither-disable-next-line uninitialized-local
        uint[PUBSIGNALS_LENGTH] memory pubSignals;

        require(input.length == PUBSIGNALS_LENGTH, "expected array length is 11");

        for (uint256 i = 0; i < PUBSIGNALS_LENGTH; i++) {
            pubSignals[i] = input[i];
        }
        return this.verifyProof(a, b, c, pubSignals);
    }
}
