// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../interfaces/IStateTransitionVerifier.sol";
import "../lib/StateLib_migration.sol";
import "../lib/SmtLib_migration.sol";

/// @title Set and get states for each identity
contract StateV2_migration is OwnableUpgradeable {
    struct StateData {
        mapping(uint256 => uint256[]) statesHistories;
        mapping(uint256 => StateEntry) stateEntries;
        uint256[50] __gap;
    }

    struct StateEntry {
        uint256 id;
        uint256 timestamp;
        uint256 block;
        uint256 replacedBy;
    }

    struct StateInfo {
        uint256 id;
        uint256 state;
        uint256 replacedByState;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
        uint256 createdAtBlock;
        uint256 replacedAtBlock;
    }

    struct SmtData {
        uint256 nodes; // just to reserve 1 slot
        uint256[] rootHistory;
        mapping(uint256 => RootEntry) rootEntries;
        uint256[50] __gap;
    }

    struct RootEntry {
        uint256 replacedByRoot;
        uint256 createdAtTimestamp;
        uint256 createdAtBlock;
    }

    IStateTransitionVerifier internal verifier; // 1 slot
    StateData internal _stateData; // 52 slots
    SmtData internal _gistData; // 53 slots

    uint256[50 + 500 - 1 - 52 - 53] private __gap;

    IStateTransitionVerifier internal verifier_migration;
    StateLib_migration.Data internal _stateData_migration;
    SmtLib_migration.Data internal _gistData_migration;

    using StateLib_migration for StateLib_migration.Data;
    using SmtLib_migration for SmtLib_migration.Data;

    function initForMigration(IStateTransitionVerifier verifierContractAddr) public onlyOwner {
        //no verifier, to block any state transitions
        verifier_migration = IStateTransitionVerifier(address(0));
        _gistData_migration.initialize(MAX_SMT_DEPTH);
    }

    function addStateWithTimestampAndBlock(
        uint256 id,
        uint256 state,
        uint256 timestamp,
        uint256 blockNumber
    ) external onlyOwner {
        _stateData_migration.addStateWithTimestampAndBlock(id, state, timestamp, blockNumber);
        if (timestamp > 0 && blockNumber > 0) {
            _gistData_migration.addLeafWithTimestampAndBlock(
                PoseidonUnit1L.poseidon([id]),
                state,
                timestamp,
                blockNumber
            );
            uint256 rootIndex = _gistData_migration.rootEntries.length - 1;
            uint256 root = _gistData_migration.rootEntries[rootIndex].root;
            uint256 expectedRoot = _gistData.rootHistory[rootIndex - 1];

            if (root != expectedRoot) {
                revert("Root mismatch");
            }
        }
    }

    function getStateInfoHistoryLengthById(uint256 id) public view returns (uint256) {
        return _stateData.statesHistories[id].length;
    }

    function getStateInfoHistoryById(uint256 id) public view returns (StateInfo[] memory) {
        uint256 length = _stateData.statesHistories[id].length;

        StateInfo[] memory states = new StateInfo[](length);
        for (uint256 i = 0; i < length; i++) {
            states[i] = _getStateInfoByState(_stateData.statesHistories[id][i]);
        }
        return states;
    }

    function getStateInfoByState(uint256 state) public view returns (StateInfo memory) {
        return _getStateInfoByState(state);
    }

    function _getStateInfoByState(uint256 state) internal view returns (StateInfo memory) {
        uint256 replByState = _stateData.stateEntries[state].replacedBy;
        return
            StateInfo({
                id: _stateData.stateEntries[state].id,
                state: state,
                replacedByState: replByState,
                createdAtTimestamp: _stateData.stateEntries[state].timestamp,
                replacedAtTimestamp: _stateData.stateEntries[replByState].timestamp,
                createdAtBlock: _stateData.stateEntries[state].block,
                replacedAtBlock: _stateData.stateEntries[replByState].block
            });
    }
}
