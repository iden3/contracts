// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../../state/StateV2.sol";

interface IState {
    function getAllStatesById(uint256 id)
        external
        view
        returns (uint256[] memory);

    function getStateInfo(uint256 state)
        external
        view
        returns (StateInfo memory);
}

contract SearchUtils {
    IState public state;

    constructor(address _state) {
        state = IState(_state);
    }

    /**
     * @dev binary search by block number
     * @param id identity
     * @param blockN block number
     * return parameters are (by order): block number, block timestamp, state
     */
    function getStateInfoByBlock(uint256 id, uint256 blockN)
        public
        view
        returns (StateInfo memory)
    {
        require(blockN <= block.number, "errNoFutureAllowed");

        StateInfo memory info;
        uint256[] memory states = state.getAllStatesById(id);
        // Case that there is no state committed
        if (states.length == 0) {
            return info;
        }
        // Case that there block searched is beyond last block committed
        uint256 lastState = states[states.length - 1];

        StateInfo memory lastStateInfo = state.getStateInfo(
            lastState
        );

        if (blockN > lastStateInfo.createdAtBlock) {
            return lastStateInfo;
        }
        // Binary search
        uint256 min = 0;
        uint256 max = states.length - 1;

        while (min <= max) {
            uint256 mid = (max + min) / 2;

            uint256 midState = states[mid];

            StateInfo memory midStateInfo = state.getStateInfo(
                midState
            );

            if (midStateInfo.createdAtBlock == blockN) {
                return midStateInfo;
            } else if (
                (blockN > midStateInfo.createdAtBlock) &&
                (mid + 1 == states.length)
            ) {
                return midStateInfo;
            } else if (
                (blockN > midStateInfo.createdAtBlock) &&
                (mid + 1 < states.length) &&
                (blockN <
                    state.getStateInfo(states[mid + 1]).createdAtBlock)
            ) {
                return midStateInfo;
            } else if (blockN > midStateInfo.createdAtBlock) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return info;
    }

    /**
     * @dev binary search by timestamp
     * @param id identity
     * @param timestamp timestamp
     * return parameters are (by order): block number, block timestamp, state
     */
    function getStateInfoByTime(uint256 id, uint256 timestamp)
        public
        view
        returns (StateInfo memory)
    {
        require(timestamp <= block.timestamp, "errNoFutureAllowed");

        StateInfo memory info;
        uint256[] memory states = state.getAllStatesById(id);
        // Case that there is no state committed
        if (states.length == 0) {
            return info;
        }
        // Case that there block searched is beyond last block committed
        uint256 lastState = states[states.length - 1];

        StateInfo memory lastStateInfo = state.getStateInfo(
            lastState
        );

        if (timestamp > lastStateInfo.createdAtTimestamp) {
            return lastStateInfo;
        }
        // Binary search
        uint256 min = 0;
        uint256 max = states.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;

            uint256 midState = states[mid];
            StateInfo memory midStateInfo = state.getStateInfo(
                midState
            );

            if (midStateInfo.createdAtTimestamp == timestamp) {
                return midStateInfo;
            } else if (
                (timestamp > midStateInfo.createdAtTimestamp) &&
                (mid + 1 == states.length)
            ) {
                return midStateInfo;
            } else if (
                (timestamp > midStateInfo.createdAtTimestamp) &&
                (mid + 1 < states.length) &&
                (timestamp <
                    state.getStateInfo(states[mid + 1]).createdAtTimestamp)
            ) {
                return midStateInfo;
            } else if (timestamp > midStateInfo.createdAtTimestamp) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return info;
    }
}
