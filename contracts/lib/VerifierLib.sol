// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ZKPVerifierBase} from "../verifiers/ZKPVerifierBase.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

/**
 * @title VerifierLib
 * @dev A library for writing proof results.
 */
library VerifierLib {
    /**
     * @dev Writes proof results.
     * @param self The ZKPVerifierStorage storage pointer
     * @param sender The sender of the proof
     * @param requestId The request ID
     * @param keyToInpIdxs The array of key to public inputs index mapping
     * @param inputs The array of public inputs
     */
    function writeProofResults(
        ZKPVerifierBase.ZKPVerifierStorage storage self,
        address sender,
        uint64 requestId,
        ICircuitValidator.KeyToInputIndex[] memory keyToInpIdxs,
        uint256[] memory inputs
    ) public {
        ZKPVerifierBase.Proof storage proof = self._proofs[sender][requestId];
        for (uint256 i = 0; i < keyToInpIdxs.length; i++) {
            proof.storageFields[keyToInpIdxs[i].key] = inputs[keyToInpIdxs[i].inputIndex];
        }

        proof.isVerified = true;
        proof.validatorVersion = self._requests[requestId].validator.version();
        proof.blockNumber = block.number;
        proof.blockTimestamp = block.timestamp;
    }

    /**
     * @dev Writes proof results.
     * @param self The ZKPVerifierStorage storage pointer
     * @param sender The sender of the proof
     * @param requestId The request ID of the proof
     * @param signals The array of public signals of the proof
     */
    function writeProofResultsV2(
        ZKPVerifierBase.ZKPVerifierStorage storage self,
        address sender,
        uint64 requestId,
        ICircuitValidator.Signal[] memory signals
    ) public {
        ZKPVerifierBase.Proof storage proof = self._proofs[sender][requestId];
        for (uint256 i = 0; i < signals.length; i++) {
            proof.storageFields[signals[i].name] = signals[i].value;
        }

        proof.isVerified = true;
        proof.validatorVersion = self._requests[requestId].validator.version();
        proof.blockNumber = block.number;
        proof.blockTimestamp = block.timestamp;
    }
}
