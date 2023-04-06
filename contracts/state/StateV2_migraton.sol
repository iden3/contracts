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

    IStateTransitionVerifier internal verifier; // 1 slot
    StateData internal _stateData; // 52 slots
    uint256[53] internal _gistData; // 53 slots

    uint256[50+500-1-52-53] private __gap;

    IStateTransitionVerifier internal verifier_migration;
    StateLib_migration.Data internal _stateData_migration;
    SmtLib_migration.Data internal _gistData_migration;

    using StateLib_migration for StateLib_migration.Data;
    using SmtLib_migration for SmtLib_migration.Data;

    function initForMigration(IStateTransitionVerifier verifierContractAddr) public {
        verifier_migration = verifierContractAddr;
        _gistData_migration.initialize(MAX_SMT_DEPTH);
    }

    function addStateWithTimestampAndBlock(uint256 id, uint256 state, uint256 timestamp, uint256 blockNumber) external onlyOwner {
        _stateData_migration.addStateWithTimestampAndBlock(id, state, timestamp, blockNumber);
        _gistData_migration.addLeafWithTimestampAndBlock(id, state, timestamp, blockNumber);
        //todo check by initial root history
    }

    function getStateEntriesLengthById(uint256 id) external view returns (uint256) {
        return _stateData.statesHistories[id].length;
    }

    function getStateEntriesById(
        uint256 id
    ) external view returns (StateEntry[] memory) {
        uint256 length = _stateData.statesHistories[id].length;
        StateEntry[] memory stateEntries = new StateEntry[](length);
        for (uint256 i = 0; i < length; i++) {
            stateEntries[i] = _stateData.stateEntries[_stateData.statesHistories[id][i]];
        }
        return stateEntries;
    }
}
