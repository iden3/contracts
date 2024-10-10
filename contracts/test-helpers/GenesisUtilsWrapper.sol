// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {GenesisUtils} from "../lib/GenesisUtils.sol";

contract GenesisUtilsWrapper {
    function getIdType(uint256 id) public pure returns (bytes2) {
        return GenesisUtils.getIdType(id);
    }

    function isGenesisState(uint256 id, uint256 idState) public pure returns (bool) {
        return GenesisUtils.isGenesisState(id, idState);
    }

    function calcIdFromGenesisState(bytes2 idType, uint256 idState) public pure returns (uint256) {
        return GenesisUtils.calcIdFromGenesisState(idType, idState);
    }

    function calcOnchainIdFromAddress(bytes2 idType, address caller) public pure returns (uint256) {
        return GenesisUtils.calcIdFromEthAddress(idType, caller);
    }
}
