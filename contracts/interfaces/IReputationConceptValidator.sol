// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface IReputationConceptValidator {

    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[6] calldata params
    ) external view returns (bool);

    function getRootInputIndex() external pure returns (uint256);

    function getHashDIDInputIndex() external pure returns (uint256);
}
