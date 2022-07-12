pragma solidity ^0.8.0;

interface ICircuitValidator {
    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external view returns (bool r);

    function getCircuitId() external pure returns (string memory r);
}
