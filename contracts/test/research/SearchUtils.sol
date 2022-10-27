pragma solidity 0.8.15;
pragma abicoder v2;

struct transitionsInfo {
    uint256 replacedAtTimestamp;
    uint256 createdAtTimestamp;
    uint256 replacedAtBlock;
    uint256 createdAtBlock;
    uint256 replacedBy;
    uint256 id;
}

interface IState {
    function getAllStatesById(uint256 id)
        external
        view
        returns (uint256[] memory);

    function getTransitionInfo(uint256 state)
        external
        view
        returns (transitionsInfo memory);
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
    function getStateDataByBlock(uint256 id, uint64 blockN)
        public
        view
        returns (transitionsInfo memory)
    {
        require(blockN < block.number, "errNoFutureAllowed");

        transitionsInfo memory info;
        uint256[] memory states = state.getAllStatesById(id);
        // Case that there is no state committed
        if (states.length == 0) {
            return info;
        }
        // Case that there block searched is beyond last block committed
        uint256 lastState = states[states.length - 1];

        transitionsInfo memory lastStateInfo = state.getTransitionInfo(
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
            // todo : check if mid + 1 is not out of range. clear bag if only one elem in root history
            uint256 midNextState = states[mid + 1];
            transitionsInfo memory midStateInfo = state.getTransitionInfo(
                midState
            );
            transitionsInfo memory midNextStateInfo = state.getTransitionInfo(
                midNextState
            );

            if (midStateInfo.createdAtBlock == blockN) {
                return midStateInfo;
            } else if (
                (blockN > midStateInfo.createdAtBlock) &&
                (blockN < midNextStateInfo.createdAtBlock)
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
    function getStateDataByTime(uint256 id, uint64 timestamp)
        public
        view
        returns (transitionsInfo memory)
    {
        require(timestamp < block.timestamp, "errNoFutureAllowed");

        transitionsInfo memory info;
        uint256[] memory states = state.getAllStatesById(id);
        // Case that there is no state committed
        if (states.length == 0) {
            return info;
        }
        // Case that there block searched is beyond last block committed
        uint256 lastState = states[states.length - 1];

        transitionsInfo memory lastStateInfo = state.getTransitionInfo(
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
            // todo : check if mid + 1 is not out of range. clear bag if only one elem in root history
            uint256 midNextState = states[mid + 1];
            transitionsInfo memory midStateInfo = state.getTransitionInfo(
                midState
            );
            transitionsInfo memory midNextStateInfo = state.getTransitionInfo(
                midNextState
            );

            if (midStateInfo.createdAtTimestamp == timestamp) {
                return midStateInfo;
            } else if (
                (timestamp > midStateInfo.createdAtTimestamp) &&
                (timestamp < midNextStateInfo.createdAtTimestamp)
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
