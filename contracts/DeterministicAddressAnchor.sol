// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

contract DeterministicAddressAnchor {
    /**
    * @dev This function purpose is just to be called by the proxy with predefined calldata
    */
    function attach(bytes calldata b) external pure {
    }
}
