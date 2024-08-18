// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IStateForProofValidation {
    function getReplacedAtOfState(
        uint256 id,
        uint256 state
    ) external view returns (uint256 replacedAt);

    function getReplacedAtOfGistRoot(uint256 root) external view returns (uint256 replacedAt);
}
