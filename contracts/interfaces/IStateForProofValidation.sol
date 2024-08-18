// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IStateForProofValidation {
    function getStateReplacedAt(
        uint256 id,
        uint256 state
    ) external view returns (uint256 replacedAt);

    function getGistRootReplacedAt(uint256 root) external view returns (uint256 replacedAt);
}
