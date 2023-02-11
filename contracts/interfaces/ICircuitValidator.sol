// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ICircuitValidator {
    struct CircuitQuery {
        uint256 schema;
        uint256 claimPathKey;
        uint256 operator;
        uint256[] value;
        uint256 queryHash;
        string circuitId;
    }

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 queryHash
    ) external view returns (bool r);

    function getCircuitId() external pure returns (string memory id);

    function getChallengeInputIndex() external pure returns (uint256 index);
}
