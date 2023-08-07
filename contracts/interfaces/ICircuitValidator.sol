// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface ICircuitValidator {
    struct CircuitQuery {
        string circuitId;
        string metadata;

        uint256 schema;
        uint256 claimPathKey;
        uint256 operator;
        uint256[] value;
        uint256 queryHash;
        uint256[] allowedIssuers;
    }

    struct ZKPResponse {
        uint256[] inputs;
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    function verify(
        ZKPResponse calldata zkpResponse,
        uint256 queryHash,
        uint256[] calldata allowedIssuers
    ) external view returns (bool r);

    function getCircuitId() external pure returns (string memory id);

    function getChallengeInputIndex() external pure returns (uint256 index);
}
