// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";
import {IStateWithTimestampGetters} from "../interfaces/IStateWithTimestampGetters.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";
import {State} from "../state/State.sol";

library StateCrossChainLib {
    uint256 constant MAX_TIMESTAMP_LAG = 1 hours;
    uint256 constant MAX_REPLACED_AT_AHEAD_OF_TIME = 5 minutes;

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

    function _setStateInfo(
        State.StateCrossChainStorage storage self,
        IStateCrossChain.IdentityStateMessage memory message,
        bytes memory signature
    ) internal {
        require(
            self._oracleProofValidator.verifyIdentityState(message, signature),
            "Identity state proof is not valid"
        );

        self._idToStateReplacedAt[message.id][message.state] = _calcReplacedAt(
            message.timestamp,
            message.replacedAtTimestamp
        );
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

        self._rootToGistRootReplacedAt[message.idType][message.root] = _calcReplacedAt(
            message.timestamp,
            message.replacedAtTimestamp
        );
    }

    function _calcReplacedAt(
        uint256 oracleTimestamp,
        uint256 replacedAtTimestamp
    ) internal view returns (uint256 replacedAt) {
        if (oracleTimestamp < block.timestamp - MAX_TIMESTAMP_LAG) {
            revert("Oracle timestamp cannot be in the past");
        }

        replacedAt = replacedAtTimestamp == 0 ? oracleTimestamp : replacedAtTimestamp;

        if (replacedAt > block.timestamp + MAX_REPLACED_AT_AHEAD_OF_TIME) {
            revert("Oracle replacedAt or oracle timestamp cannot be in the future");
        }

        // this should never happen as block.timestamp is always greater than 0
        assert(replacedAt != 0);
    }
}
