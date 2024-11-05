// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ZKPVerifierBase} from "../verifiers/ZKPVerifierBase.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

/**
 * @title VerifierLib
 * @dev A library for writing proof results.
 */
library VerifierLibReqType1 {
    function writeProofResults(
        ZKPVerifierBase.ZKPVerifierStorageProofType1 storage self,
        address sender,
        uint256 requestId,
        ICircuitValidator.Signal[] memory signals
    ) public {

        // TODO COMPLETE THE METHOD IMPLEMENTATION

        ZKPVerifierBase.ProofReqType1[] storage proofs = self._proofs[sender][requestId];

        uint256 issuerId;
        for (uint256 i = 0; i < signals.length; i++) {
            if (signals[i].name == "issuerId") {
                issuerId = signals[i].value;
            }
        }
        require(issuerId != 0, "Issuer ID not found in the signals");

        // TODO research if pushing elements with mapping would work here
        // without throwing exceptions in compilator
        proofs.push(ProofReqType1{
            isVerified: true,
            validatorVersion: self._requests[requestId].validator.version(),
            blockTimestamp: block.timestamp
        });

        ZKPVerifierBase.ProofReqType1 storage proof = proofs[proofs.length - 1];

        for (uint256 i = 0; i < signals.length; i++) {
            proof.storageFields[signals[i].name] = signals[i].value;
            if (signals[i].name == "issuerId") {
                issuerId = signals[i].value;
            }
        }

        // TODO need to incapusulate this in a function maybe
        // as we dong user proofs.length - 1 to avoid 1 proof position ambiguity
        self._indexInProofs[sender][requestId][issuerId] = proofs.length;
    }
}
