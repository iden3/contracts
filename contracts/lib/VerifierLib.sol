// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
// solhint-disable max-line-length
import {Verifier, VerifierIDIsNotValid, MultiRequestIdNotValid, GroupIdNotValid, NullifierSessionIDAlreadyExists} from "../verifiers/Verifier.sol";
import {MissingUserIDInGroupOfRequests, GroupMustHaveAtLeastTwoRequests, ResponseFieldAlreadyExists, MissingUserIDInRequest} from "../verifiers/Verifier.sol";
import {GroupIdAlreadyExists, ResponseFieldDoesNotExist, LinkIDNotTheSameForGroupedRequests, UserIDMismatch} from "../verifiers/Verifier.sol";
import {MultiRequestIdNotFound, MultiRequestIdAlreadyExists, RequestShouldNotHaveAGroup, RequestIdAlreadyExists} from "../verifiers/Verifier.sol";
import {RequestIdNotFound, RequestIdNotValid, RequestIdTypeNotValid, RequestIdUsesReservedBytes, GroupIdNotFound} from "../verifiers/Verifier.sol";
import {ProofAlreadyVerified, AuthMethodAlreadyExists, AuthMethodNotFound, ProofIsNotVerified} from "../verifiers/Verifier.sol";
// solhint-enable max-line-length
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";

library VerifierLib {
    /// @dev Link ID field name
    string private constant LINK_ID_PROOF_FIELD_NAME = "linkID";
    /// @dev User ID field name
    string private constant USER_ID_INPUT_NAME = "userID";

    // keccak256(abi.encodePacked("userID"))
    bytes32 private constant USER_ID_FIELD_NAME_HASH =
        0xeaa28503c24395f30163098dfa9f1e1cd296dd52252064784e65d95934007382;

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

    /**
     * @dev Modifier to check if the request exists
     */
    modifier checkRequestExistence(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        bool existence
    ) {
        if (existence) {
            if (!requestIdExists(self, requestId)) {
                revert RequestIdNotFound(requestId);
            }
        } else {
            if (requestIdExists(self, requestId)) {
                revert RequestIdAlreadyExists(requestId);
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the auth type exists
     */
    modifier checkAuthMethodExistence(
        Verifier.VerifierStorage storage self,
        string memory authMethod,
        bool existence
    ) {
        if (existence) {
            if (!authMethodExists(self, authMethod)) {
                revert AuthMethodNotFound(authMethod);
            }
        } else {
            if (authMethodExists(self, authMethod)) {
                revert AuthMethodAlreadyExists(authMethod);
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the multiRequest exists
     */
    modifier checkMultiRequestExistence(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        bool existence
    ) {
        if (existence) {
            if (!multiRequestIdExists(self, multiRequestId)) {
                revert MultiRequestIdNotFound(multiRequestId);
            }
        } else {
            if (multiRequestIdExists(self, multiRequestId)) {
                revert MultiRequestIdAlreadyExists(multiRequestId);
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

    /**
     * @dev Checks if the proofs from a Multirequest submitted for a given sender and request ID are verified
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function areMultiRequestProofsVerified(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address userAddress
    ) public view checkMultiRequestExistence(self, multiRequestId, true) returns (bool) {
        // 1. Check if all requests are verified for the userAddress
        bool verified = _areMultiRequestProofsVerified(self, multiRequestId, userAddress);

        if (verified) {
            // 2. Check if all linked response fields are the same
            bool linkedResponsesOK = _checkLinkedResponseFields(self, multiRequestId, userAddress);

            if (!linkedResponsesOK) {
                verified = false;
            }
        }

        return verified;
    }

    /**
     * @dev Gets the status of the multiRequest verification
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function getMultiRequestProofsStatus(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address userAddress
    )
        public
        view
        checkMultiRequestExistence(self, multiRequestId, true)
        returns (IVerifier.RequestProofStatus[] memory)
    {
        // 1. Check if all requests statuses are true for the userAddress
        IVerifier.RequestProofStatus[] memory requestProofStatus = _getMultiRequestProofsStatus(
            self,
            multiRequestId,
            userAddress
        );

        // 2. Check if all linked response fields are the same
        bool linkedResponsesOK = _checkLinkedResponseFields(self, multiRequestId, userAddress);

        if (!linkedResponsesOK) {
            revert LinkIDNotTheSameForGroupedRequests();
        }

        return requestProofStatus;
    }

    function checkNullifierSessionIdUniqueness(
        Verifier.VerifierStorage storage self,
        IVerifier.Request calldata request
    ) external {
        uint256 nullifierSessionID = request
            .validator
            .getRequestParam(request.params, "nullifierSessionID")
            .value;
        if (nullifierSessionID != 0) {
            if (self._nullifierSessionIDs[nullifierSessionID] != 0) {
                revert NullifierSessionIDAlreadyExists(nullifierSessionID);
            }
            self._nullifierSessionIDs[nullifierSessionID] = nullifierSessionID;
        }
    }

    function checkRequestIdCorrectness(
        uint256 requestId,
        bytes calldata requestParams,
        address requestOwner
    ) external pure {
        // 1. Check prefix
        uint16 requestType = _getRequestType(requestId);
        if (requestType >= 2) {
            revert RequestIdTypeNotValid();
        }
        // 2. Check reserved bytes
        if (((requestId << 16) >> 216) > 0) {
            revert RequestIdUsesReservedBytes();
        }
        // 3. Check if requestId matches the hash of the requestParams
        // 0x0000000000000000FFFF...FF. Reserved first 8 bytes for the request Id type and future use
        // 0x00010000000000000000...00. First 2 bytes for the request Id type
        //    - 0x0000... for old request Ids with uint64
        //    - 0x0001... for new request Ids with uint256
        if (requestType == 1) {
            uint256 hashValue = uint256(keccak256(abi.encodePacked(requestParams, requestOwner)));
            uint256 expectedRequestId = (hashValue &
                0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) +
                0x0001000000000000000000000000000000000000000000000000000000000000;
            if (requestId != expectedRequestId) {
                revert RequestIdNotValid(expectedRequestId, requestId);
            }
        }
    }

    function checkVerifierID(
        Verifier.VerifierStorage storage self,
        IVerifier.Request calldata request
    ) external view {
        uint256 requestVerifierID = request
            .validator
            .getRequestParam(request.params, "verifierID")
            .value;

        if (requestVerifierID != 0) {
            if (requestVerifierID != self._verifierID) {
                revert VerifierIDIsNotValid(requestVerifierID, self._verifierID);
            }
        }
    }

    /**
     * @dev Get the group of requests.
     * @return Group of requests.
     */
    function getGroupedRequests(
        Verifier.VerifierStorage storage self,
        uint256 groupID
    ) public view returns (IVerifier.RequestInfo[] memory) {
        IVerifier.RequestInfo[] memory requests = new IVerifier.RequestInfo[](
            self._groupedRequests[groupID].length
        );

        for (uint256 i = 0; i < self._groupedRequests[groupID].length; i++) {
            uint256 requestId = self._groupedRequests[groupID][i];
            IVerifier.RequestData storage rd = self._requests[requestId];

            requests[i] = IVerifier.RequestInfo({
                requestId: requestId,
                metadata: rd.metadata,
                validator: rd.validator,
                params: rd.params,
                creator: rd.creator
            });
        }

        return requests;
    }

    /**
     * @dev Gets a specific multiRequest by ID
     * @param multiRequestId The ID of the multiRequest
     * @return multiRequest The multiRequest data
     */
    function getMultiRequest(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId
    )
        public
        view
        checkMultiRequestExistence(self, multiRequestId, true)
        returns (IVerifier.MultiRequest memory multiRequest)
    {
        return self._multiRequests[multiRequestId];
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

    /**
     * @dev Gets a specific request by ID
     * @param requestId The ID of the request
     * @return request The request info
     */
    function getRequest(
        Verifier.VerifierStorage storage self,
        uint256 requestId
    )
        public
        view
        checkRequestExistence(self, requestId, true)
        returns (Verifier.RequestInfo memory request)
    {
        IVerifier.RequestData storage rd = self._requests[requestId];
        return
            IVerifier.RequestInfo({
                requestId: requestId,
                metadata: rd.metadata,
                validator: rd.validator,
                params: rd.params,
                creator: rd.creator
            });
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

    function checkCanWriteProofResults(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        address sender
    ) external view {
        Verifier.Proof storage proof = self._proofs[requestId][sender];

        if (proof.isVerified) {
            revert ProofAlreadyVerified(requestId, sender);
        }
    }

    function checkUserIDMatch(
        uint256 userIDFromAuthResponse,
        IRequestValidator.ResponseField[] memory signals
    ) external pure {
        for (uint256 j = 0; j < signals.length; j++) {
            if (keccak256(abi.encodePacked(signals[j].name)) == USER_ID_FIELD_NAME_HASH) {
                if (userIDFromAuthResponse != signals[j].value) {
                    revert UserIDMismatch(userIDFromAuthResponse, signals[j].value);
                }
            }
        }
    }

    /**
     * @dev Checks if an auth method exists
     * @param authMethod The auth method
     * @return Whether the auth type exists
     */
    function authMethodExists(
        Verifier.VerifierStorage storage self,
        string memory authMethod
    ) public view returns (bool) {
        return self._authMethods[authMethod].validator != IAuthValidator(address(0));
    }

    /**
     * @dev Sets an auth method
     * @param authMethod The auth method to add
     */
    function setAuthMethod(
        Verifier.VerifierStorage storage self,
        IVerifier.AuthMethod calldata authMethod
    ) external checkAuthMethodExistence(self, authMethod.authMethod, false) {
        self._authMethodsNames.push(authMethod.authMethod);
        self._authMethods[authMethod.authMethod] = Verifier.AuthMethodData({
            validator: authMethod.validator,
            params: authMethod.params,
            isActive: true
        });
    }

    /**
     * @dev Gets an auth type
     * @param authMethod The Id of the auth type to get
     * @return authMethodData The auth type data
     */
    function getAuthMethod(
        Verifier.VerifierStorage storage self,
        string calldata authMethod
    )
        external
        view
        checkAuthMethodExistence(self, authMethod, true)
        returns (Verifier.AuthMethodData memory authMethodData)
    {
        return self._authMethods[authMethod];
    }

    /**
     * @dev Enables an auth type
     * @param authMethod The auth type to enable
     */
    function enableAuthMethod(
        Verifier.VerifierStorage storage self,
        string calldata authMethod
    ) external checkAuthMethodExistence(self, authMethod, true) {
        self._authMethods[authMethod].isActive = true;
    }

    /**
     * @dev Disables an auth method
     * @param authMethod The auth method to disable
     */
    function disableAuthMethod(
        Verifier.VerifierStorage storage self,
        string calldata authMethod
    ) external checkAuthMethodExistence(self, authMethod, true) {
        self._authMethods[authMethod].isActive = false;
    }

    function checkGroupIdsAndRequestsPerGroup(
        Verifier.VerifierStorage storage self,
        IVerifier.Request[] calldata requests
    ) external {
        uint256 newGroupsCount = 0;
        Verifier.GroupInfo[] memory newGroupsInfo = new Verifier.GroupInfo[](requests.length);

        for (uint256 i = 0; i < requests.length; i++) {
            uint256 groupID = requests[i]
                .validator
                .getRequestParam(requests[i].params, "groupID")
                .value;

            if (groupID != 0) {
                (bool exists, uint256 groupIDIndex) = _getGroupIDIndex(
                    groupID,
                    newGroupsInfo,
                    newGroupsCount
                );

                if (!exists) {
                    if (groupIdExists(self, groupID)) {
                        revert GroupIdAlreadyExists(groupID);
                    }
                    self._groupIds.push(groupID);
                    self._groupedRequests[groupID].push(requests[i].requestId);

                    newGroupsInfo[newGroupsCount] = Verifier.GroupInfo({
                        id: groupID,
                        concatenatedRequestIds: abi.encodePacked(requests[i].requestId),
                        userIdInputExists: _isUserIDInputInRequest(requests[i])
                    });

                    newGroupsCount++;
                } else {
                    self._groupedRequests[groupID].push(requests[i].requestId);
                    newGroupsInfo[groupIDIndex].concatenatedRequestIds = abi.encodePacked(
                        newGroupsInfo[groupIDIndex].concatenatedRequestIds,
                        requests[i].requestId
                    );
                    if (_isUserIDInputInRequest(requests[i])) {
                        newGroupsInfo[groupIDIndex].userIdInputExists = true;
                    }
                }
            } else {
                // revert if standalone request is without userId public input
                if (!_isUserIDInputInRequest(requests[i])) {
                    revert MissingUserIDInRequest(requests[i].requestId);
                }
            }
        }

        _checkGroupsRequestsInfo(self, newGroupsInfo, newGroupsCount);
    }

    /**
     * @dev Sets a multiRequest
     * @param multiRequest The multiRequest data
     */
    function setMultiRequest(
        Verifier.VerifierStorage storage self,
        IVerifier.MultiRequest calldata multiRequest,
        address sender
    ) public checkMultiRequestExistence(self, multiRequest.multiRequestId, false) {
        uint256 expectedMultiRequestId = uint256(
            keccak256(abi.encodePacked(multiRequest.requestIds, multiRequest.groupIds, sender))
        );
        if (expectedMultiRequestId != multiRequest.multiRequestId) {
            revert MultiRequestIdNotValid(expectedMultiRequestId, multiRequest.multiRequestId);
        }

        self._multiRequests[multiRequest.multiRequestId] = multiRequest;
        self._multiRequestIds.push(multiRequest.multiRequestId);

        // checks for all the requests in this multiRequest
        _checkRequestsInMultiRequest(self, multiRequest.multiRequestId);
    }

    /**
     * @dev Checks if a group ID exists
     * @param groupId The ID of the group
     * @return Whether the group ID exists
     */
    function groupIdExists(
        Verifier.VerifierStorage storage self,
        uint256 groupId
    ) public view returns (bool) {
        return self._groupedRequests[groupId].length != 0;
    }

    /**
     * @dev Checks if a multiRequest ID exists
     * @param multiRequestId The ID of the multiRequest
     * @return Whether the multiRequest ID exists
     */
    function multiRequestIdExists(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId
    ) public view returns (bool) {
        return self._multiRequests[multiRequestId].multiRequestId == multiRequestId;
    }

    function _checkRequestsInMultiRequest(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId
    ) internal view {
        uint256[] memory requestIds = self._multiRequests[multiRequestId].requestIds;
        uint256[] memory groupIds = self._multiRequests[multiRequestId].groupIds;

        // check that all the single requests doesn't have group
        for (uint256 i = 0; i < requestIds.length; i++) {
            if (!requestIdExists(self, requestIds[i])) {
                revert RequestIdNotFound(requestIds[i]);
            }
            uint256 groupID = self
                ._requests[requestIds[i]]
                .validator
                .getRequestParam(self._requests[requestIds[i]].params, "groupID")
                .value;

            if (groupID != 0) {
                revert RequestShouldNotHaveAGroup(requestIds[i]);
            }
        }

        for (uint256 i = 0; i < groupIds.length; i++) {
            if (!groupIdExists(self, groupIds[i])) {
                revert GroupIdNotFound(groupIds[i]);
            }
        }
    }

    function _getGroupIDIndex(
        uint256 groupID,
        Verifier.GroupInfo[] memory groupList,
        uint256 listCount
    ) internal pure returns (bool, uint256) {
        for (uint256 j = 0; j < listCount; j++) {
            if (groupList[j].id == groupID) {
                return (true, j);
            }
        }

        return (false, 0);
    }

    function _isUserIDInputInRequest(
        IVerifier.Request memory request
    ) internal view returns (bool) {
        bool userIDInRequests = false;
        try request.validator.inputIndexOf(USER_ID_INPUT_NAME) {
            userIDInRequests = true;
            // solhint-disable-next-line no-empty-blocks
        } catch {}

        return userIDInRequests;
    }

    function _checkGroupsRequestsInfo(
        Verifier.VerifierStorage storage self,
        Verifier.GroupInfo[] memory groupList,
        uint256 groupsCount
    ) internal view {
        for (uint256 i = 0; i < groupsCount; i++) {
            uint256 calculatedGroupID = uint256(keccak256(groupList[i].concatenatedRequestIds)) &
                0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
            if (calculatedGroupID != groupList[i].id) {
                revert GroupIdNotValid();
            }
            if (self._groupedRequests[groupList[i].id].length < 2) {
                revert GroupMustHaveAtLeastTwoRequests(groupList[i].id);
            }
            if (groupList[i].userIdInputExists == false) {
                revert MissingUserIDInGroupOfRequests(groupList[i].id);
            }
        }
    }

    function _getRequestType(uint256 requestId) internal pure returns (uint16) {
        // 0x0000000000000000 - prefix for old uint64 requests
        // 0x0001000000000000 - prefix for keccak256 cut to fit in the remaining 192 bits
        return uint16(requestId >> 240);
    }

    function _areMultiRequestProofsVerified(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address userAddress
    ) internal view returns (bool) {
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

    function _getMultiRequestProofsStatus(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address userAddress
    ) internal view returns (IVerifier.RequestProofStatus[] memory) {
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

    function _checkLinkedResponseFields(
        Verifier.VerifierStorage storage self,
        uint256 multiRequestId,
        address sender
    ) internal view returns (bool) {
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
}
