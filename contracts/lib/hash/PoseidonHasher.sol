// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IHasher} from "../../interfaces/IHasher.sol";
import {PoseidonUnit2L, PoseidonUnit3L} from "../Poseidon.sol";

/// @title A IHasher implementation using Poseidon.
contract PoseidonHasher is IHasher {
    function hash2(uint256[2] memory params) external pure override returns (uint256) {
        return PoseidonUnit2L.poseidon(params);
    }

    function hash3(uint256[3] memory params) external pure override returns (uint256) {
        return PoseidonUnit3L.poseidon(params);
    }
}
