// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";
import {IStateBridgeAcceptor} from "../interfaces/IStateBridgeAcceptor.sol";
import {OracleProofValidator} from "../state/OracleProofValidator.sol";

//TODO make non-abstract contract
abstract contract LiteState is Ownable2StepUpgradeable, IState, IStateBridgeAcceptor {
    // TODO define if better to use timestamp from the next entry instead fo replaceAt
    struct Entry {
        uint256 timestamp;
        uint256 replacedByState;
        uint256 replaceAt;
    }

    struct GistRootEntry {
        uint256 replacedByRoot;
        uint256 createdAt;
        uint256 replacedAt;
    }

    struct LiteStateStorage {
        mapping(uint256 id => mapping(uint256 state => Entry)) _idToEntry;
        mapping(uint256 id => uint256 lastState) _idToLastState;
        mapping(uint256 root => GistRootEntry) _rootToGistRootEntry;
        uint256 _lastGistRoot;
        OracleProofValidator _resolverProofProcessing;
    }

    // TODO check the hash correctness
    bytes32 private constant LiteStateStorageLocation =
        0x0f7e3bdc6cc0e880d509aa1f6b8d1a88e5fcb7274e18dfba772424a36fe9b400;

    function _getLiteStateStorage() private pure returns (LiteStateStorage storage $) {
        assembly {
            $.slot := LiteStateStorageLocation
        }
    }

    constructor(OracleProofValidator resolverProofProcessing) {
        LiteStateStorage storage s = _getLiteStateStorage();
        s._resolverProofProcessing = resolverProofProcessing;
    }

    function getStateInfoById(uint256 id) external view returns (StateInfo memory) {
        LiteStateStorage storage s = _getLiteStateStorage();
        uint256 lastState = s._idToLastState[id];
        Entry storage entry = s._idToEntry[id][lastState];

        return
            StateInfo({
                id: id,
                state: lastState,
                replacedByState: entry.replacedByState,
                createdAtTimestamp: entry.timestamp,
                replacedAtTimestamp: entry.replaceAt,
                createdAtBlock: 0,
                replacedAtBlock: 0
            });
    }

    function getStateInfoByIdAndState(
        uint256 id,
        uint256 state
    ) external view returns (StateInfo memory) {
        LiteStateStorage storage s = _getLiteStateStorage();
        Entry storage entry = s._idToEntry[id][state];

        return
            StateInfo({
                id: id,
                state: state,
                replacedByState: entry.replacedByState,
                createdAtTimestamp: entry.timestamp,
                replacedAtTimestamp: entry.replaceAt,
                createdAtBlock: 0,
                replacedAtBlock: 0
            });
    }

    function idExists(uint256 id) external view returns (bool) {
        LiteStateStorage storage s = _getLiteStateStorage();
        return s._idToLastState[id] != 0;
    }

    function stateExists(uint256 id, uint256 state) external view returns (bool) {
        LiteStateStorage storage s = _getLiteStateStorage();
        return s._idToEntry[id][state].timestamp != 0;
    }

    function getGISTRootInfo(uint256 root) external view returns (GistRootInfo memory) {
        LiteStateStorage storage s = _getLiteStateStorage();
        GistRootEntry storage entry = s._rootToGistRootEntry[root];

        return
            GistRootInfo({
                root: root,
                replacedByRoot: entry.replacedByRoot,
                createdAtTimestamp: entry.createdAt,
                replacedAtTimestamp: entry.replacedAt,
                createdAtBlock: 0,
                replacedAtBlock: 0
            });
    }

    function setStateInfo(bytes memory oracleProof) external {
        LiteStateStorage storage $ = _getLiteStateStorage();

        //TODO include replacedByState in the proof
        uint256 replacedByState = 0;

        (
            ,
            uint256 timestamp,
            uint256 state,
            uint256 createdAt,
            uint256 replacedAt,
            ,,,
            uint256 id
        ) = $._resolverProofProcessing.verifyBytes(oracleProof);

        $._idToEntry[id][state] = Entry({
            timestamp: createdAt,
            replacedByState: replacedByState,
            replaceAt: replacedAt == 0 ? replacedAt : timestamp
        });

        uint256 lastState = $._idToLastState[id];
        if ($._idToEntry[id][lastState].timestamp < createdAt) {
            $._idToLastState[id] = state;
        }
    }

    function setGistRootInfo(
        bytes memory oracleProof
    ) external {
        LiteStateStorage storage $ = _getLiteStateStorage();

        //TODO include replacedByState in the proof
        uint256 replacedByRoot = 0;

        (
            ,
            uint256 timestamp,
            ,,,
            uint256 root,
            uint256 createdAt,
            uint256 replacedAt,
            uint256 id
        ) = $._resolverProofProcessing.verifyBytes(oracleProof);

        $._rootToGistRootEntry[root] = GistRootEntry({
            replacedByRoot: replacedByRoot,
            createdAt: createdAt,
            replacedAt: replacedAt == 0 ? replacedAt : timestamp
        });

        if ($._rootToGistRootEntry[$._lastGistRoot].createdAt < createdAt) {
            $._lastGistRoot = root;
        }
    }
}
