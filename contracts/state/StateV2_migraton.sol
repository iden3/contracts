// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../interfaces/IStateTransitionVerifier.sol";
import "../lib/StateLib_migration.sol";
import "../lib/SmtLib_migration.sol";
import "../lib/Smt_old.sol";

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

    IStateTransitionVerifier internal verifier; // 1 slot
    StateData internal _stateData; // 52 slots
    Smt_old.SmtData internal _gistData; // 53 slots

    uint256[50 + 500 - 1 - 52 - 53] private __gap;

    IStateTransitionVerifier internal verifier_migration;
    StateLib_migration.Data internal _stateData_migration;
    SmtLib_migration.Data internal _gistData_migration;

    using Smt_old for Smt_old.SmtData;

    using StateLib_migration for StateLib_migration.Data;
    using SmtLib_migration for SmtLib_migration.Data;

    modifier onlyExistingId(uint256 id) {
        require(idExists(id), "Identity does not exist");
        _;
    }

    modifier onlyExistingState(uint256 state) {
        require(stateExists(state), "State does not exist");
        _;
    }

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

    function getStateInfoById(
        uint256 id
    ) public view onlyExistingId(id) returns (StateInfo memory) {
        return
            _getStateInfoByState(
                _stateData.statesHistories[id][_stateData.statesHistories[id].length - 1]
            );
    }

    function getStateInfoByIdAndState(
        uint256 id,
        uint256 state
    ) external view onlyExistingState(state) returns (StateInfo memory) {
        StateInfo memory stateInfo = _getStateInfoByState(state);
        require(stateInfo.id == id, "State does not exist");
        return stateInfo;
    }

    function getGISTProof(uint256 id) public view returns (Smt_old.Proof memory) {
        return _gistData.getProof(PoseidonUnit1L.poseidon([id]));
    }

    function getGISTRootInfo(uint256 root) public view returns (Smt_old.RootInfo memory) {
        return _gistData.getRootInfo(root);
    }

    function idExists(uint256 id) public view returns (bool) {
        return _stateData.statesHistories[id].length > 0;
    }

    function stateExists(uint256 state) public view returns (bool) {
        return _stateData.stateEntries[state].id != 0;
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

    function getGISTProofByRoot(
        uint256 id,
        uint256 root
    ) external view returns (Smt_old.Proof memory) {
        Smt_old.Proof memory proof = _gistData.getProofByRoot(PoseidonUnit1L.poseidon([id]), root);
        // slither-disable-next-line uninitialized-local
        uint256[MAX_SMT_DEPTH] memory siblings;
        for (uint256 i = 0; i < MAX_SMT_DEPTH; i++) {
            siblings[i] = proof.siblings[i];
        }

        Smt_old.Proof memory result = Smt_old.Proof({
            root: proof.root,
            existence: proof.existence,
            siblings: siblings,
            index: proof.index,
            value: proof.value,
            auxExistence: proof.auxExistence,
            auxIndex: proof.auxIndex,
            auxValue: proof.auxValue
        });

        return result;
    }


    function getGISTRoot() external view returns (uint256) {
        return _gistData.getRoot();
    }
}
