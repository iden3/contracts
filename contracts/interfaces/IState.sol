// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IState {
    function getState(uint256 id) external view returns (uint256);

    function getTransitionInfo(uint256 state)
        external
        view
        returns (
            uint256,
            uint256,
            uint64,
            uint64,
            uint256,
            uint256
        );

    function transitState(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external;
}
