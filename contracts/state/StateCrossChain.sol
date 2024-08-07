// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";
import {IOracleProofValidator, IdentityStateMessage, GlobalStateMessage} from "../interfaces/IOracleProofValidator.sol";

contract StateCrossChain is Ownable2StepUpgradeable, IStateCrossChain, IState {
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

    /// @custom:storage-location erc7201:iden3.storage.StateCrossChain
    struct StateCrossChainStorage {
        mapping(uint256 id => mapping(uint256 state => StateEntry)) _idToEntry;
        mapping(uint256 id => uint256 lastState) _idToLastState;
        mapping(uint256 root => GistRootEntry) _rootToGistRootEntry;
        uint256 _lastGistRoot;
        IOracleProofValidator _oracleProofValidator;
    }

    struct IdentityStateUpdate {
        IdentityStateMessage idStateMsg;
        bytes signature;
    }

    struct GlobalStateUpdate {
        GlobalStateMessage globalStateMsg;
        bytes signature;
    }

    struct CrossChainProof {
        string proofType; // gross16,
        bytes proof;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.StateCrossChain")) - 1))
    //  & ~bytes32(uint256(0xff));
    bytes32 private constant StateCrossChainStorageLocation =
        0xfe6de916382846695d2555237dc6c0ef6555f4c949d4ba263e03532600778100;

    modifier stateEntryExists(uint256 id, uint256 state) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();

        require(s._idToEntry[id][state].createdAt != 0, "Entry not found");
        _;
    }

    modifier gistRootEntryExists(uint256 root) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
        require(root == 0 || s._rootToGistRootEntry[root].createdAt != 0, "Gist root not found");
        _;
    }

    function _getStateCrossChainStorage() private pure returns (StateCrossChainStorage storage $) {
        assembly {
            $.slot := StateCrossChainStorageLocation
        }
    }

    constructor(IOracleProofValidator validator) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
        s._oracleProofValidator = validator;
    }

    function getStateInfoById(uint256 id) external view returns (StateInfo memory) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
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
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
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
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
        return s._idToLastState[id] != 0;
    }

    function stateExists(uint256 id, uint256 state) external view returns (bool) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
        return s._idToEntry[id][state].createdAt != 0;
    }

    function getGISTRootInfo(
        uint256 root
    ) external view gistRootEntryExists(root) returns (GistRootInfo memory) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();
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

    function processProof(
        bytes calldata proof
    ) public {
        (CrossChainProof[] memory proofs)
            = abi.decode(proof, (CrossChainProof[]));

        for (uint256 i = 0; i < proofs.length; i++) {

            if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("globalStateProof"))) {
                (GlobalStateUpdate memory globalStateUpd)
                    = abi.decode(proofs[i].proof, (GlobalStateUpdate));

                setGistRootInfo(
                    globalStateUpd.globalStateMsg,
                    globalStateUpd.signature
                );

            } else if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("stateProof"))) {
                IdentityStateUpdate memory idStateUpd
                    = abi.decode(proofs[i].proof, (IdentityStateUpdate));

                setStateInfo(
                    idStateUpd.idStateMsg,
                    idStateUpd.signature
                );
            } else {
                revert("Unknown proof type");
            }
        }
    }

    function setStateInfo(IdentityStateMessage memory msg, bytes memory signature) public {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();

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

    function setGistRootInfo(GlobalStateMessage memory msg, bytes memory signature) public {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();

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
