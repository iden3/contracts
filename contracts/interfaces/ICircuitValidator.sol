// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

interface ICircuitValidator {
    struct KeyToInputValue {
        string key;
        uint256 inputValue;
    }

    struct IdentityStateMessage {
        uint256 timestamp;
        uint256 id;
        uint256 state;
        uint256 replacedAtTimestamp;
    }

    struct GlobalStateMessage {
        uint256 timestamp;
        bytes2 idType;
        uint256 root;
        uint256 replacedAtTimestamp;
    }

    function version() external view returns (string memory);

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) external returns (ICircuitValidator.KeyToInputValue[] memory);

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        bytes calldata crossChainProof,
        address sender
    ) external returns (ICircuitValidator.KeyToInputValue[] memory);

    function getSupportedCircuitIds() external view returns (string[] memory ids);

    function inputIndexOf(string memory name) external view returns (uint256);
}
