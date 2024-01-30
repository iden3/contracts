// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import {ICircuitValidator} from "./ICircuitValidator.sol";

interface ICircuitValidatorExtended is ICircuitValidator {
    function verifyWithSender(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) external view returns (ICircuitValidator.KeyInputIndexPair[] memory);
}
