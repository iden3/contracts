// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Forwarder {
    // TODO replace _destination with constant and remove initialized and initialize() function
    // ----- TO DO -----
    address private _destination;
    bool public initialized;

    function initialize(address destination) public {
        require(!initialized, "Already initialized");
        _destination = destination;
        initialized = true;
    }
    // ----- TO DO -----

    function _delegate(address destination) private {

        bytes memory data = abi.encodePacked(msg.data, msg.sender);

        assembly {
        // Call the implementation.
        // out and outsize are 0 because we don't know the size yet.
            let result := call(gas(), destination, callvalue(), add(data, 0x20), mload(data), 0, 0)

        // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    fallback() external payable virtual {
        _delegate(_destination);
    }
}
