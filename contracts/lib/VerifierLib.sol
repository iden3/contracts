// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {Verifier, ResponseFieldAlreadyExists, ResponseFieldDoesNotExist} from "../verifiers/Verifier.sol";
import {RequestIdNotFound, ProofIsNotVerified, ProofAlreadyVerified} from "../verifiers/Verifier.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

library VerifierLib {
    /// @dev Link ID field name
    string private constant LINK_ID_PROOF_FIELD_NAME = "linkID";
    /// @dev User ID field name
    string private constant USER_ID_INPUT_NAME = "userID";

    /**
     * @dev Modifier to check if the request is verified
     * @param requestId The ID of the request
     * @param sender The address of the user
     * @param verification Whether request should be verified or not
     */
    modifier checkVerification(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        address sender,
        bool verification
    ) {
        if (!requestIdExists(self, requestId)) {
            revert RequestIdNotFound(requestId);
        }
        Verifier.Proof storage proof = self._proofs[requestId][sender];
        if (verification) {
            if (!proof.isVerified) {
                revert ProofIsNotVerified(requestId, sender);
            }
        } else {
            if (proof.isVerified) {
                revert ProofAlreadyVerified(requestId, sender);
            }
        }
        _;
    }

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

    function areMultiRequestProofsVerified(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address userAddress
    ) external view returns (bool) {
        IVerifier.MultiRequest storage multiRequest = self._multiRequests[multiRequestId];

        for (uint256 i = 0; i < multiRequest.requestIds.length; i++) {
            uint256 requestId = multiRequest.requestIds[i];

            if (!self._proofs[requestId][userAddress].isVerified) {
                return false;
            }
        }

        for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
            uint256 groupId = multiRequest.groupIds[i];

            for (uint256 j = 0; j < self._groupedRequests[groupId].length; j++) {
                uint256 requestId = self._groupedRequests[groupId][j];

                if (!self._proofs[requestId][userAddress].isVerified) {
                    return false;
                }
            }
        }

        return true;
    }

    function getMultiRequestProofsStatus(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address userAddress
    ) external view returns (IVerifier.RequestProofStatus[] memory) {
        IVerifier.MultiRequest storage multiRequest = self._multiRequests[multiRequestId];

        uint256 lengthGroupIds;

        if (multiRequest.groupIds.length > 0) {
            for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
                uint256 groupId = multiRequest.groupIds[i];
                lengthGroupIds += self._groupedRequests[groupId].length;
            }
        }

        IVerifier.RequestProofStatus[]
            memory requestProofStatus = new IVerifier.RequestProofStatus[](
                multiRequest.requestIds.length + lengthGroupIds
            );

        for (uint256 i = 0; i < multiRequest.requestIds.length; i++) {
            uint256 requestId = multiRequest.requestIds[i];
            Verifier.Proof storage proof = self._proofs[requestId][userAddress];

            requestProofStatus[i] = IVerifier.RequestProofStatus({
                requestId: requestId,
                isVerified: proof.isVerified,
                validatorVersion: "",
                timestamp: 0
            });

            if (proof.isVerified) {
                Verifier.ProofEntry storage lastProofEntry = proof.proofEntries[
                    proof.proofEntries.length - 1
                ];

                requestProofStatus[i].validatorVersion = lastProofEntry.validatorVersion;
                requestProofStatus[i].timestamp = lastProofEntry.blockTimestamp;
            }
        }

        for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
            uint256 groupId = multiRequest.groupIds[i];

            for (uint256 j = 0; j < self._groupedRequests[groupId].length; j++) {
                uint256 requestId = self._groupedRequests[groupId][j];
                Verifier.Proof storage proof = self._proofs[requestId][userAddress];

                requestProofStatus[multiRequest.requestIds.length + j] = IVerifier
                    .RequestProofStatus({
                        requestId: requestId,
                        isVerified: proof.isVerified,
                        validatorVersion: "",
                        timestamp: 0
                    });

                if (proof.isVerified) {
                    Verifier.ProofEntry storage lastProofEntry = proof.proofEntries[
                        proof.proofEntries.length - 1
                    ];

                    requestProofStatus[multiRequest.requestIds.length + j]
                        .validatorVersion = lastProofEntry.validatorVersion;
                    requestProofStatus[multiRequest.requestIds.length + j]
                        .timestamp = lastProofEntry.blockTimestamp;
                }
            }
        }

        return requestProofStatus;
    }

    function getResponseFieldValue(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        address sender,
        string memory responseFieldName
    ) public view checkVerification(self, requestId, sender, true) returns (uint256) {
        Verifier.Proof storage proof = self._proofs[requestId][sender];
        if (
            proof.proofEntries[proof.proofEntries.length - 1].responseFieldIndexes[
                responseFieldName
            ] == 0
        ) {
            revert ResponseFieldDoesNotExist(requestId, sender, responseFieldName);
        }

        return proof.proofEntries[proof.proofEntries.length - 1].responseFields[responseFieldName];
    }

    function getResponseFields(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        address sender
    )
        public
        view
        checkVerification(self, requestId, sender, true)
        returns (IRequestValidator.ResponseField[] memory)
    {
        Verifier.Proof storage proof = self._proofs[requestId][sender];
        Verifier.ProofEntry storage lastProofEntry = proof.proofEntries[
            proof.proofEntries.length - 1
        ];

        IRequestValidator.ResponseField[]
            memory responseFields = new IRequestValidator.ResponseField[](
                lastProofEntry.responseFieldNames.length
            );

        for (uint256 i = 0; i < lastProofEntry.responseFieldNames.length; i++) {
            responseFields[i] = IRequestValidator.ResponseField({
                name: lastProofEntry.responseFieldNames[i],
                value: lastProofEntry.responseFields[lastProofEntry.responseFieldNames[i]],
                rawValue: ""
            });
        }

        return responseFields;
    }

    function checkLinkedResponseFields(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address sender
    ) external view returns (bool) {
        for (uint256 i = 0; i < self._multiRequests[multiRequestId].groupIds.length; i++) {
            uint256 groupId = self._multiRequests[multiRequestId].groupIds[i];

            // Check linkID in the same group or requests is the same
            uint256 requestLinkID = getResponseFieldValue(
                self,
                self._groupedRequests[groupId][0],
                sender,
                LINK_ID_PROOF_FIELD_NAME
            );
            for (uint256 j = 1; j < self._groupedRequests[groupId].length; j++) {
                uint256 requestLinkIDToCompare = getResponseFieldValue(
                    self,
                    self._groupedRequests[groupId][j],
                    sender,
                    LINK_ID_PROOF_FIELD_NAME
                );
                if (requestLinkID != requestLinkIDToCompare) {
                    return false;
                }
            }
        }

        return true;
    }

    function isUserIDInputInRequest(IVerifier.Request memory request) external view returns (bool) {
        bool userIDInRequests = false;
        try request.validator.inputIndexOf(USER_ID_INPUT_NAME) {
            userIDInRequests = true;
            // solhint-disable-next-line no-empty-blocks
        } catch {}

        return userIDInRequests;
    }

    function getRequestProofStatus(
        Verifier.VerifierStorage storage self,
        address sender,
        uint256 requestId
    ) external view returns (IVerifier.RequestProofStatus memory) {
        Verifier.Proof storage proof = self._proofs[requestId][sender];
        if (proof.isVerified) {
            Verifier.ProofEntry storage lastProofEntry = proof.proofEntries[
                proof.proofEntries.length - 1
            ];

            return
                IVerifier.RequestProofStatus(
                    requestId,
                    true,
                    lastProofEntry.validatorVersion,
                    lastProofEntry.blockTimestamp
                );
        } else {
            return IVerifier.RequestProofStatus(requestId, false, "", 0);
        }
    }

    /**
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return Whether the request ID exists
     */
    function requestIdExists(
        Verifier.VerifierStorage storage self,
        uint256 requestId
    ) public view returns (bool) {
        return self._requests[requestId].validator != IRequestValidator(address(0));
    }
}
