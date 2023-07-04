// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ArrayUtils} from "../lib/ArrayUtils.sol";

/// @title Library for state data management.
// It's purpose is to keep records of identity states along with their metadata and history.
library StateLib {
    /**
     * @dev Max return array length for id history requests
     */
    uint256 public constant ID_HISTORY_RETURN_LIMIT = 1000;

    /**
     * @dev Struct for public interfaces to represent a state information.
     * @param id identity.
     * @param state A state.
     * @param replacedByState A state, which replaced this state for the identity.
     * @param createdAtTimestamp A time when the state was created.
     * @param replacedAtTimestamp A time when the state was replaced by the next identity state.
     * @param createdAtBlock A block number when the state was created.
     * @param replacedAtBlock A block number when the state was replaced by the next identity state.
     */
    struct EntryInfo {
        uint256 id;
        uint256 state;
        uint256 replacedByState;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
        uint256 createdAtBlock;
        uint256 replacedAtBlock;
    }

    /**
     * @dev Struct for identity state internal storage representation.
     * @param state A state.
     * @param timestamp A time when the state was committed to blockchain.
     * @param block A block number when the state was committed to blockchain.
     */
    struct Entry {
        uint256 state;
        uint256 timestamp;
        uint256 block;
    }

    /**
     * @dev Struct for storing all the state data.
     * We assume that a state can repeat more than once for the same identity,
     * so we keep a mapping of state entries per each identity and state.
     * @param statesHistories A state history per each identity.
     * @param stateEntries A state metadata of each state.
     */
    struct Data {
        /*
        id => stateEntry[]
        --------------------------------
        id1 => [
            index 0: StateEntry1 {state1, timestamp2, block1},
            index 1: StateEntry2 {state2, timestamp2, block2},
            index 2: StateEntry3 {state1, timestamp3, block3}
        ]
        */
        mapping(uint256 => Entry[]) stateEntries;
        /*
        id => state => stateEntryIndex[]
        -------------------------------
        id1 => state1 => [index0, index2],
        id1 => state2 => [index1]
         */
        mapping(uint256 => mapping(uint256 => uint256[])) stateIndexes;
        // This empty reserved space is put in place to allow future versions
        // of the State contract to add new SmtData struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[48] __gap;
    }

    /**
     * @dev event called when a state is updated
     * @param id identity
     * @param blockN Block number when the state has been committed
     * @param timestamp Timestamp when the state has been committed
     * @param state Identity state committed
     */
    event StateUpdated(uint256 id, uint256 blockN, uint256 timestamp, uint256 state);

    /**
     * @dev Revert if identity does not exist in the contract
     * @param id Identity
     */
    modifier onlyExistingId(Data storage self, uint256 id) {
        require(idExists(self, id), "Identity does not exist");
        _;
    }

    /**
     * @dev Revert if state does not exist in the contract
     * @param id Identity
     * @param state State
     */
    modifier onlyExistingState(
        Data storage self,
        uint256 id,
        uint256 state
    ) {
        require(stateExists(self, id, state), "State does not exist");
        _;
    }

    /**
     * @dev Add a state to the contract with transaction timestamp and block number.
     * @param id Identity
     * @param state State
     */
    function addState(Data storage self, uint256 id, uint256 state) external {
        _addState(self, id, state, block.timestamp, block.number);
    }

    /**
     * @dev Add a state to the contract with zero timestamp and block number.
     * @param id Identity
     * @param state State
     */
    function addGenesisState(Data storage self, uint256 id, uint256 state) external {
        require(
            !idExists(self, id),
            "Zero timestamp and block should be only in the first identity state"
        );
        _addState(self, id, state, 0, 0);
    }

    /**
     * @dev Retrieve the last state info for a given identity.
     * @param id Identity.
     * @return State info of the last committed state.
     */
    function getStateInfoById(
        Data storage self,
        uint256 id
    ) external view onlyExistingId(self, id) returns (EntryInfo memory) {
        Entry[] storage stateEntries = self.stateEntries[id];
        Entry memory se = stateEntries[stateEntries.length - 1];

        return
            EntryInfo({
                id: id,
                state: se.state,
                replacedByState: 0,
                createdAtTimestamp: se.timestamp,
                replacedAtTimestamp: 0,
                createdAtBlock: se.block,
                replacedAtBlock: 0
            });
    }

    /**
     * @dev Retrieve states quantity for a given identity
     * @param id identity
     * @return states quantity
     */
    function getStateInfoHistoryLengthById(
        Data storage self,
        uint256 id
    ) external view onlyExistingId(self, id) returns (uint256) {
        return self.stateEntries[id].length;
    }

    /**
     * Retrieve state infos for a given identity
     * @param id Identity
     * @param startIndex Start index of the state history.
     * @param length Max length of the state history retrieved.
     * @return A list of state infos of the identity
     */
    function getStateInfoHistoryById(
        Data storage self,
        uint256 id,
        uint256 startIndex,
        uint256 length
    ) external view onlyExistingId(self, id) returns (EntryInfo[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            self.stateEntries[id].length,
            startIndex,
            length,
            ID_HISTORY_RETURN_LIMIT
        );

        EntryInfo[] memory result = new EntryInfo[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getStateInfoByIndex(self, id, i);
        }

        return result;
    }

    /**
     * @dev Retrieve state info by id and state.
     * Note, that the latest state info is returned,
     * if the state repeats more that once for the same identity.
     * @param id An identity.
     * @param state A state.
     * @return The state info.
     */
    function getStateInfoByIdAndState(
        Data storage self,
        uint256 id,
        uint256 state
    ) external view onlyExistingState(self, id, state) returns (EntryInfo memory) {
        return _getStateInfoByState(self, id, state);
    }

    /**
     * @dev Retrieve state entries quantity by id and state.
     * If the state repeats more that once for the same identity,
     * the length will be greater than 1.
     * @param id An identity.
     * @param state A state.
     * @return The state info list length.
     */
    function getStateInfoListLengthByIdAndState(
        Data storage self,
        uint256 id,
        uint256 state
    ) external view returns (uint256) {
        return self.stateIndexes[id][state].length;
    }

    /**
     * @dev Retrieve state info list by id and state.
     * If the state repeats more that once for the same identity,
     * the length of the list may be greater than 1.
     * @param id An identity.
     * @param state A state.
     * @param startIndex Start index in the same states list.
     * @param length Max length of the state info list retrieved.
     * @return The state info list.
     */
    function getStateInfoListByIdAndState(
        Data storage self,
        uint256 id,
        uint256 state,
        uint256 startIndex,
        uint256 length
    ) external view onlyExistingState(self, id, state) returns (EntryInfo[] memory) {
        uint256[] storage stateIndexes = self.stateIndexes[id][state];
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            stateIndexes.length,
            startIndex,
            length,
            ID_HISTORY_RETURN_LIMIT
        );

        EntryInfo[] memory result = new EntryInfo[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getStateInfoByIndex(self, id, stateIndexes[i]);
        }

        return result;
    }

    /**
     * @dev Check if identity exists.
     * @param id Identity
     * @return True if the identity exists
     */
    function idExists(Data storage self, uint256 id) public view returns (bool) {
        return self.stateEntries[id].length > 0;
    }

    /**
     * @dev Check if state exists.
     * @param id Identity
     * @param state State
     * @return True if the state exists
     */
    function stateExists(Data storage self, uint256 id, uint256 state) public view returns (bool) {
        return self.stateIndexes[id][state].length > 0;
    }

    function _addState(
        Data storage self,
        uint256 id,
        uint256 state,
        uint256 _timestamp,
        uint256 _block
    ) internal {
        Entry[] storage stateEntries = self.stateEntries[id];

        stateEntries.push(Entry({state: state, timestamp: _timestamp, block: _block}));
        self.stateIndexes[id][state].push(stateEntries.length - 1);

        emit StateUpdated(id, _block, _timestamp, state);
    }

    /**
     * @dev Get state info by id and state without state existence check.
     * @param id Identity
     * @param state State
     * @return The state info
     */
    function _getStateInfoByState(
        Data storage self,
        uint256 id,
        uint256 state
    ) internal view returns (EntryInfo memory) {
        uint256[] storage indexes = self.stateIndexes[id][state];
        uint256 lastIndex = indexes[indexes.length - 1];
        return _getStateInfoByIndex(self, id, lastIndex);
    }

    function _getStateInfoByIndex(
        Data storage self,
        uint256 id,
        uint256 index
    ) internal view returns (EntryInfo memory) {
        bool isLastState = index == self.stateEntries[id].length - 1;
        Entry storage se = self.stateEntries[id][index];

        return
            EntryInfo({
                id: id,
                state: se.state,
                replacedByState: isLastState ? 0 : self.stateEntries[id][index + 1].state,
                createdAtTimestamp: se.timestamp,
                replacedAtTimestamp: isLastState ? 0 : self.stateEntries[id][index + 1].timestamp,
                createdAtBlock: se.block,
                replacedAtBlock: isLastState ? 0 : self.stateEntries[id][index + 1].block
            });
    }
}
