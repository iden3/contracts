// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IStateForProofValidation {
    function processProof(bytes calldata proof) external;

    function getStateReplacedAt(
        uint256 id,
        uint256 state
    ) external view returns (uint256 replacedAt);

    function getGistRootReplacedAt(bytes2 idType, uint256 root) external view returns (uint256 replacedAt);
}
