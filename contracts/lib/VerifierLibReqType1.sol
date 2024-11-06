// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ZKPVerifierBase} from "../verifiers/ZKPVerifierBase.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";

/**
 * @title VerifierLib
 * @dev A library for writing proof results.
 */
library VerifierLibReqType1 {
    function writeProofResults(
        ZKPVerifierBase.ZKPVerifierStorageProofType1 storage self,
        address sender,
        uint256 requestId,
        ICircuitValidator.Signal[] memory signals,
        IZKPVerifier.ZKPRequest memory request
    ) public {

        // TODO COMPLETE THE METHOD IMPLEMENTATION

        ZKPVerifierBase.ProofReqType1[] storage proofs = self._proofs[sender][requestId];

        uint256 issuerId;
        for (uint256 i = 0; i < signals.length; i++) {
            if (keccak256(bytes(signals[i].name)) == keccak256("issuerId")) {
                issuerId = signals[i].value;
            }
        }
        require(issuerId != 0, "Issuer ID not found in the signals");

        proofs.push();
        ZKPVerifierBase.ProofReqType1 storage proof = proofs[proofs.length - 1];
        for (uint256 i = 0; i < signals.length; i++) {
            proof.storageFields[signals[i].name] = signals[i].value;
        }
        proof.isVerified = true;
        proof.validatorVersion = request.validator.version();
        proof.blockTimestamp = block.timestamp;

        // TODO need to incapusulate this in a function maybe
        // as we dong user proofs.length - 1 to avoid 1 proof position ambiguity
        self._proofsByIssuers[sender][requestId][issuerId] = proofs.length;
    }

    function getLastIssuerIdFromProofs(ZKPVerifierBase.ZKPVerifierStorageProofType1 storage self,
        address sender,
        uint256 requestId) public view returns (uint256) {
        ZKPVerifierBase.ProofReqType1[] storage proofs = self._proofs[sender][requestId];
        ZKPVerifierBase.ProofReqType1 storage proof = proofs[proofs.length - 1];
        uint256 issuerId = proof.storageFields["issuerId"];
        require(issuerId != 0, "Issuer ID not found in the signals");
        
        return issuerId;
    }
}
