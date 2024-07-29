// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ILiteState} from "../interfaces/ILiteState.sol";
import {IStateOracleProofAcceptor} from "../interfaces/IStateOracleProofAcceptor.sol";
import {IOracleProofValidator, IdentityStateMessage, GlobalStateMessage} from "../interfaces/IOracleProofValidator.sol";

contract LiteState is Ownable2StepUpgradeable, ILiteState {
    struct StateEntry {
        uint256 createdAt;
        uint256 replacedByState;
        uint256 replaceAt;
    }

    struct GistRootEntry {
        uint256 replacedByRoot;
        uint256 createdAt;
        uint256 replacedAt;
    }

    struct LiteStateStorage {
        mapping(uint256 id => mapping(uint256 state => StateEntry)) _idToEntry;
        mapping(uint256 id => uint256 lastState) _idToLastState;
        mapping(uint256 root => GistRootEntry) _rootToGistRootEntry;
        uint256 _lastGistRoot;
        IOracleProofValidator _oracleProofValidator;
    }

    // TODO check the hash correctness
    bytes32 private constant LiteStateStorageLocation =
        0x0f7e3bdc6cc0e880d509aa1f6b8d1a88e5fcb7274e18dfba772424a36fe9b400;

    modifier stateEntryExists(uint256 id, uint256 state) {
        LiteStateStorage storage s = _getLiteStateStorage();
        require(s._idToEntry[id][state].createdAt != 0, "Entry not found");
        _;
    }

    modifier gistRootEntryExists(uint256 root) {
        LiteStateStorage storage s = _getLiteStateStorage();
        require(s._rootToGistRootEntry[root].createdAt != 0, "Gist root not found");
        _;
    }

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
        StateEntry storage entry = s._idToEntry[id][lastState];
        require(entry.createdAt != 0, "State not found");

        return
            StateInfo({
                id: id,
                state: lastState,
                replacedByState: entry.replacedByState,
                createdAtTimestamp: entry.createdAt,
                replacedAtTimestamp: entry.replaceAt,
                createdAtBlock: 0,
                replacedAtBlock: 0
            });
    }

    function getStateInfoByIdAndState(
        uint256 id,
        uint256 state
    ) external view stateEntryExists(id, state) returns (StateInfo memory) {
        LiteStateStorage storage s = _getLiteStateStorage();
        StateEntry storage entry = s._idToEntry[id][state];

        return
            StateInfo({
                id: id,
                state: state,
                replacedByState: entry.replacedByState,
                createdAtTimestamp: entry.createdAt,
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
        return s._idToEntry[id][state].createdAt != 0;
    }

    function getGISTRootInfo(uint256 root) external view gistRootEntryExists(root) returns (GistRootInfo memory) {
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

        $._idToEntry[msg.identity][msg.state] = StateEntry({
            replacedByState: msg.replacedByState,
            createdAt: msg.createdAtTimestamp,
            replaceAt: msg.replacedAtTimestamp == 0 ? msg.timestamp : msg.replacedAtTimestamp
        });

        uint256 lastState = $._idToLastState[msg.identity];
        if ($._idToEntry[msg.identity][lastState].createdAt < msg.createdAtTimestamp) {
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

    function getDefaultIdType() external view returns (bytes2) {
        revert("Not implemented");
    }

    function transitState(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external {
        revert("Not implemented");
    }

    function transitStateGeneric(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256 methodId,
        bytes calldata methodParams
    ) external {
        revert("Not implemented");
    }
}
