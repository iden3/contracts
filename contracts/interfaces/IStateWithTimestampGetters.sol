// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IStateWithTimestampGetters {
    function getStateReplacedAt(
        uint256 id,
        uint256 state
    ) external view returns (uint256 replacedAtTimestamp);

    function getGistRootReplacedAt(
        bytes2 idType,
        uint256 root
    ) external view returns (uint256 replacedAtTimestamps);

    function getIdTypeIfSupported(uint256 id) external view returns (bytes2 idType);
}
