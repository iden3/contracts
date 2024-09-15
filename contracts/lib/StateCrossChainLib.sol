// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";
import {IStateWithTimestampGetters} from "../interfaces/IStateWithTimestampGetters.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";
import {State} from "../state/State.sol";

library StateCrossChainLib {
    function processCrossChainProof(
        State.StateCrossChainStorage storage self,
        bytes calldata proof
    ) public {
        if (proof.length == 0) {
            return;
        }

        IStateCrossChain.CrossChainProof[] memory proofs = abi.decode(
            proof,
            (IStateCrossChain.CrossChainProof[])
        );

        for (uint256 i = 0; i < proofs.length; i++) {
            if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("globalStateProof"))) {
                IStateCrossChain.GlobalStateProcessResult memory gsp = self
                    ._oracleProofValidator
                    .processGlobalStateProof(proofs[i].proof);
                self._rootToGistRootReplacedAt[gsp.idType][gsp.root] = gsp.replacedAt;
            } else if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("stateProof"))) {
                IStateCrossChain.IdentityStateProcessResult memory isu = self
                    ._oracleProofValidator
                    .processIdentityStateProof(proofs[i].proof);
                self._idToStateReplacedAt[isu.id][isu.state] = isu.replacedAt;
            } else {
                revert("Unknown proof type");
            }
        }
    }
}
