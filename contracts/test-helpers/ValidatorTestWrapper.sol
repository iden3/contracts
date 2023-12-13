// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

contract ValidatorTestWrapper {
    ICircuitValidator public validator;

    constructor(address _verifier) {
        validator = ICircuitValidator(_verifier);
    }

    /// @return r  bool true if proof is valid
    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        bytes calldata data
    ) public returns (bool r) {
        bytes4 selector = validator.verify.selector;
        bytes memory data = abi.encodePacked(selector, abi.encode(inputs, a, b, c, data), msg.sender);
        (bool success, bytes memory returnData) = address(validator).call(data);
        if (!success) {
            if (returnData.length > 0) {
                // Extract revert reason from returnData
                assembly {
                    let returnDataSize := mload(returnData)
                    revert(add(32, returnData), returnDataSize)
                }
            } else {
                revert("Failed to verify proof without revert reason");
            }
        }
        return success;
    }
}
