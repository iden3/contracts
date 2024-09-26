// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";

contract PrimitiveTypeUtilsWrapper {
    function addressToUint256LE(address _addr) public pure returns (uint256) {
        return PrimitiveTypeUtils.addressToUint256LE(_addr);
    }

    function uint256LEToAddress(uint256 input) public pure returns (address) {
        return PrimitiveTypeUtils.uint256LEToAddress(input);
    }

    function addressToUint256(address _addr) public pure returns (uint256) {
        return PrimitiveTypeUtils.addressToUint256(_addr);
    }

    function uint256ToAddress(uint256 input) public pure returns (address) {
        return PrimitiveTypeUtils.uint256ToAddress(input);
    }
}
