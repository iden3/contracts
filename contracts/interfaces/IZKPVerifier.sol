pragma solidity ^0.8.0;

import "./ICircuitValidator.sol";

interface IZKP {
    function submitZKPResponse(
        bytes4 fnSelector,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external returns (bool);

    function setZKPRequest(bytes4 fnSelector,address validator, ICircuitValidator.CircuitQuery memory query) external returns (bool);

    function getZKPRequest(bytes4 fnSelector) external view returns (ICircuitValidator.CircuitQuery memory);
}
