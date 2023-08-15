// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface IStateTransitionVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external view returns (bool r);
}
