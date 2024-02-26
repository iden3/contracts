// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface ICircuitValidator {
    struct KeyToInputIndex {
        string key;
        uint256 inputIndex;
    }

    function version() external view returns (string memory);

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) external view returns (ICircuitValidator.KeyToInputIndex[] memory);

    function getSupportedCircuitIds() external view returns (string[] memory ids);

    function inputIndexOf(string memory name) external view returns (uint256);
}
