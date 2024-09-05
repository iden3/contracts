// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {GenesisUtils} from "../lib/GenesisUtils.sol";

contract StateWithTimestampGettersStub {
    function getStateReplacedAt(
        uint256 id,
        uint256 state
    ) external view returns (uint256 replacedAtTimestamp) {
        return 0;
    }

    function getGistRootReplacedAt(
        bytes2 idType,
        uint256 root
    ) external view returns (uint256 replacedAtTimestamps) {
        return 0;
    }

    function getIdTypeIfSupported(uint256 id) external view returns (bytes2 idType) {
        return GenesisUtils.getIdType(id);
    }
}
