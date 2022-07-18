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
}
