// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface ICircuitValidator {
    struct CircuitQuery {
        string circuitId;
        string metadata;
        bytes queryData;
    }

    struct ZKPResponse {
        uint256[] inputs;
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    function verify(
        ZKPResponse calldata zkpResponse,
        bytes calldata circuitQueryData
    ) external view returns (bool r);

    function getCircuitId() external pure returns (string memory id);

    function getChallengeInputIndex() external pure returns (uint256 index);
}
