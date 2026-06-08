// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IHasher} from "../../interfaces/IHasher.sol";

/// @title A IHasher implementation using Keccak256.
contract Keccak256Hasher is IHasher {
    function hash2(uint256[2] memory params) external pure override returns (uint256) {
        bytes memory encoded = abi.encode(params);
        return uint256(keccak256(encoded));
    }

    function hash3(uint256[3] memory params) external pure override returns (uint256) {
        bytes memory encoded = abi.encode(params);
        return uint256(keccak256(encoded));
    }
}
