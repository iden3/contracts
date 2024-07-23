// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStateBridgeAcceptor {
    function setStateInfo(
        uint256 id,
        uint256 state,
        uint256 replacedByState,
        uint256 createdAtTimestamp,
        uint256 replacedAtTimestamp,
        bytes memory oracleProof
    ) external;

    function setGistRootInfo(
        uint256 root,
        uint256 replacedByRoot,
        uint256 createdAtTimestamp,
        uint256 replacedAtTimestamp,
        bytes memory oracleProof
    ) external;
}
