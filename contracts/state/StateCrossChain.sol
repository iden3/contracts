// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";
import {IOracleProofValidator, IdentityStateMessage, GlobalStateMessage} from "../interfaces/IOracleProofValidator.sol";
import {IStateForProofValidation} from "../interfaces/IStateForProofValidation.sol";

contract StateCrossChain is Ownable2StepUpgradeable, IStateCrossChain, IStateForProofValidation {
    /// @custom:storage-location erc7201:iden3.storage.StateCrossChain
    struct StateCrossChainStorage {
        mapping(uint256 id => mapping(uint256 state => uint256)) _idToStateReplacedAt;
        mapping(uint256 root => uint256) _rootToGistRootRelacedAt;
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

        // Check by replacedAt by assumption that it is never 0
        require(s._idToStateReplacedAt[id][state] != 0, "State entry not found");
        _;
    }

    modifier gistRootEntryExists(uint256 root) {
        StateCrossChainStorage storage s = _getStateCrossChainStorage();

        // Check by replacedAt by assumption that it is never 0
        require(root == 0 || s._rootToGistRootRelacedAt[root] != 0, "Gist root not found");
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

    function processProof(bytes calldata proof) public {
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
    }

    function getGistRootReplacedAt(
        uint256 root
    ) external view gistRootEntryExists(root) returns (uint256 replacedAt) {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();
        replacedAt = $._rootToGistRootRelacedAt[root];
    }

    function _setStateInfo(IdentityStateMessage memory msg, bytes memory signature) internal {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();

        require(
            $._oracleProofValidator.verifyIdentityState(msg, signature),
            "Identity state proof is not valid"
        );

        $._idToStateReplacedAt[msg.identity][msg.state] = msg.replacedAtTimestamp == 0
            ? msg.timestamp
            : msg.replacedAtTimestamp;
    }

    function _setGistRootInfo(GlobalStateMessage memory msg, bytes memory signature) internal {
        StateCrossChainStorage storage $ = _getStateCrossChainStorage();

        require(
            $._oracleProofValidator.verifyGlobalState(msg, signature),
            "Global state proof is not valid"
        );

        $._rootToGistRootRelacedAt[msg.root] = msg.replacedAtTimestamp == 0
            ? msg.timestamp
            : msg.replacedAtTimestamp;
    }
}
