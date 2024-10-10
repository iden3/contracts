// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

/// @title This contract as a dummy implementation for Proxy contract if we need to revert all calls
// This can be applied to disable all methods of a proxy contract with explicit error message
contract AlwaysRevert {
    fallback() external payable {
        revert("The contract is disabled");
    }
}
