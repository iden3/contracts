// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.16;

interface IERC20ZKP {
    function transferWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 amount
    ) external returns (bool);
}
