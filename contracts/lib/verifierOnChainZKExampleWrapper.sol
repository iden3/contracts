// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./verifierOnChainZKExample.sol";

contract VerifierOnChainZKExampleWrapper is VerifierOnChainZKExample {
    /// @return r  bool true if proof is valid
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) public view returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);

        if (verify(input, proof) == 0) {
            return true;
        }
        return false;
    }
}
