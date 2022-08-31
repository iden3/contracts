pragma solidity ^0.8.0;

import "./ICircuitValidator.sol";

interface IZKPVerifier {
    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external returns (bool);

    function setZKPRequest(
        uint64 requestId,
        ICircuitValidator validator,
        ICircuitValidator.CircuitQuery memory query
    ) external returns (bool);

    function getZKPRequest(uint64 requestId)
        external
        returns (ICircuitValidator.CircuitQuery memory);
}
