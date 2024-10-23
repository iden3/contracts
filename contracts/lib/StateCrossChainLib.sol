// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IState} from "../interfaces/IState.sol";
import {State} from "../state/State.sol";

/**
 * @title StateCrossChainLib
 * @dev The library provides functions to process cross chain proofs.
 */
library StateCrossChainLib {
    bytes32 private constant GLOBAL_STATE_PROOF_TYPE = keccak256(bytes("globalStateProof"));

    bytes32 private constant STATE_PROOF_TYPE = keccak256(bytes("stateProof"));

    /**
     * @dev Processes cross chain proofs.
     * @param self The StateCrossChainStorage storage pointer.
     * @param crossChainProofs The cross chain proofs.
     */
    function processCrossChainProofs(
        State.StateCrossChainStorage storage self,
        bytes calldata crossChainProofs
    ) public {
        if (crossChainProofs.length == 0) {
            return;
        }

        IState.CrossChainProof[] memory proofs = abi.decode(
            crossChainProofs,
            (IState.CrossChainProof[])
        );

        for (uint256 i = 0; i < proofs.length; i++) {
            if (keccak256(bytes(proofs[i].proofType)) == GLOBAL_STATE_PROOF_TYPE) {
                IState.GlobalStateProcessResult memory gsp = self
                    ._crossChainProofValidator
                    .processGlobalStateProof(proofs[i].proof);
                self._rootToGistRootReplacedAt[gsp.idType][gsp.root] = gsp.replacedAtTimestamp;
            } else if (keccak256(bytes(proofs[i].proofType)) == STATE_PROOF_TYPE) {
                IState.IdentityStateProcessResult memory isu = self
                    ._crossChainProofValidator
                    .processIdentityStateProof(proofs[i].proof);
                self._idToStateReplacedAt[isu.id][isu.state] = isu.replacedAtTimestamp;
            } else {
                revert("Unknown proof type");
            }
        }
    }
}
