// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";
import {IStateBridgeAcceptor} from "../interfaces/IStateBridgeAcceptor.sol";
import {IOracleProofValidator, IdentityStateMessage, GlobalStateMessage} from "../interfaces/IOracleProofValidator.sol";

//TODO make non-abstract contract, split IState interface maybe
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
        IOracleProofValidator _oracleProofValidator;
    }

    // TODO check the hash correctness
    bytes32 private constant LiteStateStorageLocation =
        0x0f7e3bdc6cc0e880d509aa1f6b8d1a88e5fcb7274e18dfba772424a36fe9b400;

    function _getLiteStateStorage() private pure returns (LiteStateStorage storage $) {
        assembly {
            $.slot := LiteStateStorageLocation
        }
    }

    constructor(IOracleProofValidator validator) {
        LiteStateStorage storage s = _getLiteStateStorage();
        s._oracleProofValidator = validator;
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

    function setStateInfo(IdentityStateMessage memory msg, bytes memory signature) external {
        LiteStateStorage storage $ = _getLiteStateStorage();

        require(
            $._oracleProofValidator.verifyIdentityState(msg, signature),
            "Identity state proof is not valid"
        );

        $._idToEntry[msg.identity][msg.state] = Entry({
            timestamp: msg.createdAtTimestamp,
            replacedByState: msg.replacedByState,
            replaceAt: msg.replacedAtTimestamp == 0 ? msg.timestamp : msg.replacedAtTimestamp
        });

        uint256 lastState = $._idToLastState[msg.identity];
        if ($._idToEntry[msg.identity][lastState].timestamp < msg.createdAtTimestamp) {
            $._idToLastState[msg.identity] = msg.state;
        }
    }

    function setGistRootInfo(GlobalStateMessage calldata msg, bytes calldata signature) external {
        LiteStateStorage storage $ = _getLiteStateStorage();

        require(
            $._oracleProofValidator.verifyGlobalState(msg, signature),
            "Global state proof is not valid"
        );

        $._rootToGistRootEntry[msg.root] = GistRootEntry({
            replacedByRoot: msg.replacedByRoot,
            createdAt: msg.createdAtTimestamp,
            replacedAt: msg.replacedAtTimestamp == 0 ? msg.timestamp : msg.replacedAtTimestamp
        });

        if ($._rootToGistRootEntry[$._lastGistRoot].createdAt < msg.createdAtTimestamp) {
            $._lastGistRoot = msg.root;
        }
    }
}
