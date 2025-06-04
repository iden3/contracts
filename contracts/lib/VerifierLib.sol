// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {Verifier, ResponseFieldAlreadyExists} from "../verifiers/Verifier.sol";

library VerifierLib {
    function writeProofResults(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        address sender,
        IRequestValidator.ResponseField[] memory responseFields
    ) external {
        Verifier.Proof storage proof = self._proofs[requestId][sender];
        proof.isVerified = true;
        proof.proofEntries.push();

        Verifier.ProofEntry storage proofEntry = proof.proofEntries[proof.proofEntries.length - 1];
        proofEntry.validatorVersion = self._requests[requestId].validator.version();
        proofEntry.blockTimestamp = block.timestamp;

        for (uint256 i = 0; i < responseFields.length; i++) {
            if (proofEntry.responseFieldIndexes[responseFields[i].name] != 0) {
                revert ResponseFieldAlreadyExists(requestId, sender, responseFields[i].name);
            }

            proofEntry.responseFields[responseFields[i].name] = responseFields[i].value;
            proofEntry.responseFieldNames.push(responseFields[i].name);
            // we are not using a real index defined by length-1 here but defined by just length
            // which shifts the index by 1 to avoid 0 value
            proofEntry.responseFieldIndexes[responseFields[i].name] = proofEntry
                .responseFieldNames
                .length;
        }
    }
}
