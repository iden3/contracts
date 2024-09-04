// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";
import {IStateWithTimestampGetters} from "../interfaces/IStateWithTimestampGetters.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";
import {State} from "../state/State.sol";

library StateCrossChainLib {
    function _setStateInfo(
        State.StateCrossChainStorage storage self,
        IStateCrossChain.IdentityStateMessage memory message,
        bytes memory signature
    ) internal {
        require(
            self._oracleProofValidator.verifyIdentityState(message, signature),
            "Identity state proof is not valid"
        );

        uint256 replacedAt = message.replacedAtTimestamp == 0
            ? message.timestamp
            : message.replacedAtTimestamp;
        require(replacedAt != 0, "ReplacedAt cannot be 0");

        self._idToStateReplacedAt[message.id][message.state] = replacedAt;
    }

    function _setGistRootInfo(
        State.StateCrossChainStorage storage self,
        IStateCrossChain.GlobalStateMessage memory message,
        bytes memory signature
    ) internal {
        require(
            self._oracleProofValidator.verifyGlobalState(message, signature),
            "Global state proof is not valid"
        );

        uint256 replacedAt = message.replacedAtTimestamp == 0
            ? message.timestamp
            : message.replacedAtTimestamp;
        require(replacedAt != 0, "ReplacedAt cannot be 0");

        self._rootToGistRootReplacedAt[message.idType][message.root] = replacedAt;
    }

    function processProof(State.StateCrossChainStorage storage self, bytes calldata proof) public {
        if (proof.length == 0) {
            return;
        }

        IStateCrossChain.CrossChainProof[] memory proofs = abi.decode(
            proof,
            (IStateCrossChain.CrossChainProof[])
        );

        for (uint256 i = 0; i < proofs.length; i++) {
            if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("globalStateProof"))) {
                IStateCrossChain.GlobalStateUpdate memory globalStateUpd = abi.decode(
                    proofs[i].proof,
                    (IStateCrossChain.GlobalStateUpdate)
                );

                _setGistRootInfo(self, globalStateUpd.globalStateMsg, globalStateUpd.signature);
            } else if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("stateProof"))) {
                IStateCrossChain.IdentityStateUpdate memory idStateUpd = abi.decode(
                    proofs[i].proof,
                    (IStateCrossChain.IdentityStateUpdate)
                );

                _setStateInfo(self, idStateUpd.idStateMsg, idStateUpd.signature);
            } else {
                revert("Unknown proof type");
            }
        }
    }
}
