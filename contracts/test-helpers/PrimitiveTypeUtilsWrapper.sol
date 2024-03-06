// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

contract PrimitiveTypeUtilsWrapper {

    function addressToChallenge(address _addr) public pure returns (uint256) {
        return PrimitiveTypeUtils.addressToChallenge(_addr);
    }

    function challengeToAddress(uint256 input) public pure returns (address) {
        return PrimitiveTypeUtils.challengeToAddress(input);
    }

}
