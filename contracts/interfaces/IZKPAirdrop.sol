// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IZKPAirdrop {
    function mintWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external returns (bool);
}
