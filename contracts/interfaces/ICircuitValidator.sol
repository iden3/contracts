// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IWormhole} from "../validators/wormhole/interfaces/IWormhole.sol";

struct InputParams {
    uint256[] inputs;
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    bytes data;
    address sender;
    bytes response;
    IWormhole.Signature[] signatures;
}

interface ICircuitValidator {
    struct KeyToInputIndex {
        string key;
        uint256 inputIndex;
    }

    function version() external view returns (string memory);

    function verify(
        InputParams memory params
    ) external view returns (ICircuitValidator.KeyToInputIndex[] memory);

    function getSupportedCircuitIds() external view returns (string[] memory ids);

    function inputIndexOf(string memory name) external view returns (uint256);
}
