// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;


import "../lib/GenesisUtils.sol";

contract GenesisUtilsWrapper {

     function isGenesisState(uint256 id, uint256 idState) public pure returns (bool) {
       return GenesisUtils.isGenesisState(id, idState);
    }

}