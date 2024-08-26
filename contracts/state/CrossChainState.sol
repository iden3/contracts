// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IState} from "../interfaces/IState.sol";
import {IdentityStateMessage, GlobalStateMessage} from "../interfaces/ICircuitValidator.sol";
import {IStateForProofValidation} from "../interfaces/IStateForProofValidation.sol";
import {IState} from "../interfaces/IState.sol";
import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";

abstract contract StateCrossChain is IStateForProofValidation {
    /// @custom:storage-location erc7201:iden3.storage.StateCrossChain
    struct StateCrossChainStorage {
        mapping(uint256 id => mapping(uint256 state => uint256 replacedAt)) _idToStateReplacedAt;
        mapping(bytes2 idType => mapping(uint256 root => uint256 replacedAt)) _rootToGistRootReplacedAt;
        IOracleProofValidator _oracleProofValidator;
        IState _state;
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
        string proofType;
        bytes proof;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.StateCrossChain")) - 1))
    //  & ~bytes32(uint256(0xff));
    bytes32 private constant StateCrossChainStorageLocation =
        0xfe6de916382846695d2555237dc6c0ef6555f4c949d4ba263e03532600778100;

    function _getStateCrossChainStorage() private pure returns (StateCrossChainStorage storage $) {
        assembly {
            $.slot := StateCrossChainStorageLocation
        }
    }

    modifier stateEntryExists(uint256 id, uint256 state) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();

        // Check by replacedAt by assumption that it is never 0
        require(s._idToStateReplacedAt[id][state] != 0, "State entry not found");
        _;
    }

    modifier gistRootEntryExists(uint256 root) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();

        // Check by replacedAt by assumption that it is never 0
        require(root == 0 || s._rootToGistRootReplacedAt[root] != 0, "Gist root not found");
        _;
    }

    function initializeStateCrossChain(IOracleProofValidator validator, IState state) internal {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();
        $._oracleProofValidator = validator;
        $._state = state;
    }

    function processProof(bytes calldata proof) public {
        if (proof.length == 0) {
            return;
        }

        CrossChainProof[] memory proofs = abi.decode(proof, (CrossChainProof[]));

        for (uint256 i = 0; i < proofs.length; i++) {
            if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("globalStateProof"))) {
                GlobalStateUpdate memory globalStateUpd = abi.decode(
                    proofs[i].proof,
                    (GlobalStateUpdate)
                );

                _setGistRootInfo(globalStateUpd.globalStateMsg, globalStateUpd.signature);
            } else if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("stateProof"))) {
                IdentityStateUpdate memory idStateUpd = abi.decode(
                    proofs[i].proof,
                    (IdentityStateUpdate)
                );

                _setStateInfo(idStateUpd.idStateMsg, idStateUpd.signature);
            } else {
                revert("Unknown proof type");
            }
        }
    }

    function getStateReplacedAt(
        uint256 id,
        uint256 state
    ) external view stateEntryExists(id, state) returns (uint256 replacedAt) {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();
        replacedAt = $._idToStateReplacedAt[id][state];
        if (replacedAt == 0) {
            if ($._state.idExists(id)) {
                replacedAt = $._state.getStateInfoByIdAndState(id, state).createdAtTimestamp;
            } else {
                if (GenesisUtils.isGenesisState(id, state)) {
                    replacedAt = 0;
                } else {
                    revert("State entry not found");
                }
            }
        }
    }

    function getGistRootReplacedAt(
        bytes2 idType,
        uint256 root
    ) external view gistRootEntryExists(root) returns (uint256 replacedAt) {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();
        replacedAt = $._rootToGistRootReplacedAt[idType][root];
        if (replacedAt == 0) {
            //TODO check if this is correct, or use the other method
            require($._state.isTypeSupported(idType), "idType not supported by state");
            replacedAt = $._state.getGISTRootInfo(root).createdAtTimestamp;
        }
    }

    function _setStateInfo(IdentityStateMessage memory message, bytes memory signature) internal {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();

        require(
            $._oracleProofValidator.verifyIdentityState(message, signature),
            "Identity state proof is not valid"
        );

        uint256 replacedAt = message.replacedAtTimestamp == 0
            ? message.timestamp
            : message.replacedAtTimestamp;
        require(replacedAt != 0, "ReplacedAt cannot be 0");

        $._idToStateReplacedAt[message.identity][message.state] = replacedAt;
    }

    function _setGistRootInfo(GlobalStateMessage memory message, bytes memory signature) internal {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();

        require(
            $._oracleProofValidator.verifyGlobalState(message, signature),
            "Global state proof is not valid"
        );

        uint256 replacedAt = message.replacedAtTimestamp == 0
            ? message.timestamp
            : message.replacedAtTimestamp;
        require(replacedAt != 0, "ReplacedAt cannot be 0");

        $._rootToGistRootReplacedAt[message.root] = replacedAt;
    }
}
