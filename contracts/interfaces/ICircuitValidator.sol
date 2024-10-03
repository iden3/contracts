// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IState} from "./IState.sol";

interface ICircuitValidator {
    struct KeyToInputIndex {
        string key;
        uint256 inputIndex;
    }

    struct Signal {
        string name;
        uint256 value;
    }

    function version() external view returns (string memory);

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) external returns (ICircuitValidator.KeyToInputIndex[] memory);

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        address sender,
        IState state
    ) external returns (ICircuitValidator.Signal[] memory);

    function getSupportedCircuitIds() external view returns (string[] memory ids);

    function inputIndexOf(string memory name) external view returns (uint256);
}
