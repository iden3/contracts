// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

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

    function bytesSlicePer31BytesToUint256Array(
        bytes memory data
    ) public pure returns (uint256[] memory) {
        return PrimitiveTypeUtils.bytesSlicePer31BytesToUint256Array(data);
    }
}
