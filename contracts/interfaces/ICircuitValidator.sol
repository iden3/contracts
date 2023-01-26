// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ICircuitValidator {
    struct CircuitQuery {
        uint256 queryHash;
        string circuitId;
    }

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        CircuitQuery memory query
    ) external view returns (bool r);

    function getCircuitId() external pure returns (string memory id);

    function getChallengeInputIndex() external pure returns (uint256 index);
}
