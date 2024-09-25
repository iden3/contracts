// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.26;

import {ICrossChainProofValidator} from "../interfaces/ICrossChainProofValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {State} from "../state/State.sol";

library StateCrossChainLib {
    function processCrossChainProof(
        State.StateCrossChainStorage storage self,
        bytes calldata proof
    ) public {
        if (proof.length == 0) {
            return;
        }

        IState.CrossChainProof[] memory proofs = abi.decode(proof, (IState.CrossChainProof[]));

        for (uint256 i = 0; i < proofs.length; i++) {
            if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("globalStateProof"))) {
                IState.GlobalStateProcessResult memory gsp = self
                    ._crossChainProofValidator
                    .processGlobalStateProof(proofs[i].proof);
                self._rootToGistRootReplacedAt[gsp.idType][gsp.root] = gsp.replacedAt;
            } else if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("stateProof"))) {
                IState.IdentityStateProcessResult memory isu = self
                    ._crossChainProofValidator
                    .processIdentityStateProof(proofs[i].proof);
                self._idToStateReplacedAt[isu.id][isu.state] = isu.replacedAt;
            } else {
                revert("Unknown proof type");
            }
        }
    }
}
