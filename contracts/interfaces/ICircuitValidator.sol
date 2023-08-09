// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface ICircuitValidator {
    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data
    ) external view returns (bool r);

    function getCircuitId() external pure returns (string memory id);

    function inputIndexOf(string memory name) external pure returns (uint256);
}
