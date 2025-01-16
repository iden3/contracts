// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {VerifierLib} from "../lib/VerifierLib.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

error RequestIdNotFound(uint256 requestId);
error RequestAlreadyExists(uint256 requestId);
error GroupIdNotFound(uint256 groupId);
error GroupIdAlreadyExists(uint256 groupId);
error MultiRequestIdNotFound(uint256 multiRequestId);
error MultiRequestIdAlreadyExists(uint256 multiRequestId);
error AuthTypeNotFound(string authType);
error AuthTypeAlreadyExists(string authType);
error ValidatorNotWhitelisted(address validator);
error RequestIsAlreadyGrouped(uint256 requestId);
error LinkIDNotTheSameForGroupedRequests();
error UserIDNotFound(uint256 userID);
error UserIDNotLinkedToAddress(uint256 userID, address userAddress);
error UserNotAuthenticated();
error UserIDMismatch(uint256 userIDFromAuth, uint256 userIDFromResponse);
error MetadataNotSupportedYet();
error GroupMustHaveAtLeastTwoRequests(uint256 groupID);
error NullifierSessionIDAlreadyExists(uint256 nullifierSessionID);
error VerifierIDIsNotValid(uint256 requestVerifierID, uint256 expectedVerifierID);
error RequestIdNotValid();
error RequestIdUsesReservedBytes();
error ResponseFieldAlreadyExists(string responseFieldName);

abstract contract Verifier is IVerifier, ContextUpgradeable {
    /// @dev Key to retrieve the linkID from the proof storage
    string constant LINKED_PROOF_KEY = "linkID";

    struct AuthTypeData {
        IAuthValidator validator;
        bytes params;
        bool isActive;
    }

    struct UserAddressToIdInfo {
        uint256 userID;
        uint256 timestamp;
    }

    struct UserIdToAddressInfo {
        address userAddress;
        uint256 timestamp;
    }

    /// @custom:storage-location erc7201:iden3.storage.Verifier
    struct VerifierStorage {
        // Information about requests
        // solhint-disable-next-line
        mapping(uint256 requestId => mapping(address sender => VerifierLib.Proof)) _proofs;
        mapping(uint256 requestId => IVerifier.RequestData) _requests;
        uint256[] _requestIds;
        IState _state;
        mapping(uint256 groupId => uint256[] requestIds) _groupedRequests;
        uint256[] _groupIds;
        // Information about multiRequests
        mapping(uint256 multiRequestId => IVerifier.MultiRequest) _multiRequests;
        uint256[] _multiRequestIds;
        // Information about auth types and validators
        string[] _authTypes;
        mapping(string authType => AuthTypeData) _authMethods;
        mapping(uint256 nullifierSessionID => uint256 requestId) _nullifierSessionIDs;
        // verifierID to check in requests
        uint256 _verifierID;
    }

    // solhint-disable-next-line
    // keccak256(abi.encode(uint256(keccak256("iden3.storage.Verifier")) -1 )) & ~bytes32(uint256(0xff));
    bytes32 internal constant VerifierStorageLocation =
        0x11369addde4aae8af30dcf56fa25ad3d864848d3201d1e9197f8b4da18a51a00;

    using VerifierLib for VerifierStorage;

    /**
     * @dev Modifier to check if the request exists
     */
    modifier checkRequestExistence(uint256 requestId, bool existence) {
        if (existence) {
            if (!requestIdExists(requestId)) {
                revert RequestIdNotFound(requestId);
            }
        } else {
            if (requestIdExists(requestId)) {
                revert RequestAlreadyExists(requestId);
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the request exists
     */
    modifier checkRequestGroupExistence(Request memory request, bool existence) {
        IRequestValidator.RequestParams memory requestParams = request.validator.getRequestParams(
            request.params
        );

        if (requestParams.groupID != 0) {
            if (existence) {
                if (!groupIdExists(requestParams.groupID)) {
                    revert GroupIdNotFound(requestParams.groupID);
                }
            } else {
                if (groupIdExists(requestParams.groupID)) {
                    revert GroupIdAlreadyExists(requestParams.groupID);
                }
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the multiRequest exists
     */
    modifier checkMultiRequestExistence(uint256 multiRequestId, bool existence) {
        if (existence) {
            if (!multiRequestIdExists(multiRequestId)) {
                revert MultiRequestIdNotFound(multiRequestId);
            }
        } else {
            if (multiRequestIdExists(multiRequestId)) {
                revert MultiRequestIdAlreadyExists(multiRequestId);
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the auth type exists
     */
    modifier checkAuthTypeExistence(string memory authType, bool existence) {
        if (existence) {
            if (!authTypeExists(authType)) {
                revert AuthTypeNotFound(authType);
            }
        } else {
            if (authTypeExists(authType)) {
                revert AuthTypeAlreadyExists(authType);
            }
        }
        _;
    }

    function _setState(IState state) internal {
        _getVerifierStorage()._state = state;
    }

    function __Verifier_init(IState state) internal onlyInitializing {
        __Verifier_init_unchained(state);
    }

    function __Verifier_init_unchained(IState state) internal onlyInitializing {
        _setState(state);
        // initial calculation of verifierID from contract address and default id type from State contract
        VerifierStorage storage s = _getVerifierStorage();
        bytes2 idType = s._state.getDefaultIdType();
        uint256 calculatedVerifierID = GenesisUtils.calcIdFromEthAddress(idType, address(this));
        _setVerifierID(calculatedVerifierID);
    }

    function _getVerifierStorage() private pure returns (VerifierStorage storage $) {
        assembly {
            $.slot := VerifierStorageLocation
        }
    }

    function _setVerifierID(uint256 verifierID) internal {
        VerifierStorage storage s = _getVerifierStorage();
        s._verifierID = verifierID;
    }

    /**
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return Whether the request ID exists
     */
    function requestIdExists(uint256 requestId) public view returns (bool) {
        return
            _getVerifierStorage()._requests[requestId].validator != IRequestValidator(address(0));
    }

    /**
     * @dev Checks if a group ID exists
     * @param groupId The ID of the group
     * @return Whether the group ID exists
     */
    function groupIdExists(uint256 groupId) public view returns (bool) {
        return _getVerifierStorage()._groupedRequests[groupId].length != 0;
    }

    /**
     * @dev Checks if a multiRequest ID exists
     * @param multiRequestId The ID of the multiRequest
     * @return Whether the multiRequest ID exists
     */
    function multiRequestIdExists(uint256 multiRequestId) public view returns (bool) {
        return
            _getVerifierStorage()._multiRequests[multiRequestId].multiRequestId == multiRequestId;
    }

    /**
     * @dev Checks if an auth type exists
     * @param authType The auth type
     * @return Whether the auth type exists
     */
    function authTypeExists(string memory authType) public view returns (bool) {
        return _getVerifierStorage()._authMethods[authType].isActive == true;
    }

    /**
     * @dev Sets a request
     * @param request The request data
     */
    function _setRequestWithChecks(
        Request calldata request
    )
        internal
        checkRequestExistence(request.requestId, false)
        checkRequestGroupExistence(request, false)
    {
        _setRequest(request);
    }

    function _setRequest(
        Request calldata request
    ) internal virtual checkRequestExistence(request.requestId, false) {
        VerifierStorage storage s = _getVerifierStorage();
        IRequestValidator.RequestParams memory requestParams = request.validator.getRequestParams(
            request.params
        );

        s._requests[request.requestId] = IVerifier.RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params,
            creator: _msgSender(),
            verifierId: requestParams.verifierID
        });
        s._requestIds.push(request.requestId);
    }

    /**
     * @dev Sets different requests
     * @param requests The list of requests
     */
    function setRequests(IVerifier.Request[] calldata requests) public {
        VerifierStorage storage s = _getVerifierStorage();

        uint256 newGroupsCount = 0;
        uint256[] memory newGroupsGroupID = new uint256[](requests.length);
        uint256[] memory newGroupsRequestCount = new uint256[](requests.length);

        // 1. Check first that groupIds don't exist and keep the number of requests per group.
        for (uint256 i = 0; i < requests.length; i++) {
            uint256 groupID = requests[i].validator.getRequestParams(requests[i].params).groupID;

            if (groupID != 0) {
                if (groupIdExists(groupID)) {
                    revert GroupIdAlreadyExists(groupID);
                }

                (bool exists, uint256 groupIDIndex) = _getGroupIDIndex(
                    groupID,
                    newGroupsGroupID,
                    newGroupsCount
                );

                if (!exists) {
                    newGroupsGroupID[newGroupsCount] = groupID;
                    newGroupsRequestCount[newGroupsCount]++;
                    newGroupsCount++;
                } else {
                    newGroupsRequestCount[groupIDIndex]++;
                }
            }
        }

        _checkGroupsRequestsCount(newGroupsGroupID, newGroupsRequestCount, newGroupsCount);

        // 2. Set requests checking groups and nullifierSessionID uniqueness
        for (uint256 i = 0; i < requests.length; i++) {
            _checkRequestIdCorrectness(requests[i].requestId);

            _checkNullifierSessionIdUniqueness(requests[i]);
            _checkVerifierID(requests[i]);

            uint256 groupID = requests[i].validator.getRequestParams(requests[i].params).groupID;

            // request without group
            if (groupID == 0) {
                _setRequestWithChecks(requests[i]);
            } else {
                // request with group
                if (!groupIdExists(groupID)) {
                    s._groupIds.push(groupID);
                }

                _setRequest(requests[i]);
                s._groupedRequests[groupID].push(requests[i].requestId);
            }
        }
    }

    function _checkVerifierID(IVerifier.Request calldata request) internal view {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 requestVerifierID = request.validator.getRequestParams(request.params).verifierID;

        if (requestVerifierID != 0) {
            if (requestVerifierID != s._verifierID) {
                revert VerifierIDIsNotValid(requestVerifierID, s._verifierID);
            }
        }
    }

    function _getRequestType(uint256 requestId) internal pure returns (uint8) {
        // 0x0000000000000000 - prefix for old uint64 requests
        // 0x0000000000000001 - prefix for keccak256 cut to fit in the remaining 192 bits
        return uint8(requestId >> 248);
    }

    function _checkRequestIdCorrectness(uint256 requestId) internal pure {
        // 1. Check prefix
        uint8 requestType = _getRequestType(requestId);
        if (requestType >= 2) {
            revert RequestIdNotValid();
        }
        // 2. Check reserved bytes
        if (((requestId << 8) >> 200) > 0) {
            revert RequestIdUsesReservedBytes();
        }
    }

    function _checkNullifierSessionIdUniqueness(IVerifier.Request calldata request) internal {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 nullifierSessionID = request
            .validator
            .getRequestParams(request.params)
            .nullifierSessionID;
        if (nullifierSessionID != 0) {
            if (s._nullifierSessionIDs[nullifierSessionID] != 0) {
                revert NullifierSessionIDAlreadyExists(nullifierSessionID);
            }
            s._nullifierSessionIDs[nullifierSessionID] = nullifierSessionID;
        }
    }

    function _getGroupIDIndex(
        uint256 groupID,
        uint256[] memory groupList,
        uint256 listCount
    ) internal pure returns (bool, uint256) {
        for (uint256 j = 0; j < listCount; j++) {
            if (groupList[j] == groupID) {
                return (true, j);
            }
        }

        return (false, 0);
    }

    function _checkGroupsRequestsCount(
        uint256[] memory groupList,
        uint256[] memory groupRequestsList,
        uint256 groupsCount
    ) internal pure {
        for (uint256 i = 0; i < groupsCount; i++) {
            if (groupRequestsList[i] < 2) {
                revert GroupMustHaveAtLeastTwoRequests(groupList[i]);
            }
        }
    }

    /**
     * @dev Gets a specific request by ID
     * @param requestId The ID of the request
     * @return request The request info
     */
    function getRequest(
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (RequestInfo memory request) {
        VerifierStorage storage $ = _getVerifierStorage();
        IVerifier.RequestData storage rd = $._requests[requestId];
        return
            IVerifier.RequestInfo({
                requestId: requestId,
                metadata: rd.metadata,
                validator: rd.validator,
                params: rd.params,
                creator: rd.creator,
                verifierId: rd.verifierId
            });
    }

    /**
     * @dev Sets a multiRequest
     * @param multiRequest The multiRequest data
     */
    function setMultiRequest(
        IVerifier.MultiRequest calldata multiRequest
    ) public virtual checkMultiRequestExistence(multiRequest.multiRequestId, false) {
        VerifierStorage storage s = _getVerifierStorage();
        s._multiRequests[multiRequest.multiRequestId] = multiRequest;
        s._multiRequestIds.push(multiRequest.multiRequestId);

        // checks for all the requests in this multiRequest
        _checkRequestsInMultiRequest(multiRequest.multiRequestId);
    }

    /**
     * @dev Gets a specific multiRequest by ID
     * @param multiRequestId The ID of the multiRequest
     * @return multiRequest The multiRequest data
     */
    function getMultiRequest(
        uint256 multiRequestId
    ) public view returns (IVerifier.MultiRequest memory multiRequest) {
        return _getVerifierStorage()._multiRequests[multiRequestId];
    }

    function _checkRequestsInMultiRequest(uint256 multiRequestId) internal view {
        VerifierStorage storage s = _getVerifierStorage();

        uint256[] memory requestIds = s._multiRequests[multiRequestId].requestIds;

        // check that all the single requests doesn't have group
        for (uint256 i = 0; i < requestIds.length; i++) {
            IRequestValidator.RequestParams memory requestParams = s
                ._requests[requestIds[i]]
                .validator
                .getRequestParams(s._requests[requestIds[i]].params);
            if (requestParams.groupID != 0) {
                revert RequestIsAlreadyGrouped(requestIds[i]);
            }
        }
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param authResponse Auth response including auth type and proof
     * @param responses The list of responses including request ID, proof and metadata for requests
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(
        AuthResponse memory authResponse,
        Response[] memory responses,
        bytes memory crossChainProofs
    ) public virtual {
        VerifierStorage storage $ = _getVerifierStorage();
        address sender = _msgSender();

        // 1. Process crossChainProofs
        $._state.processCrossChainProofs(crossChainProofs);

        // TODO: Get userID from responses that has userID informed (LinkedMultiquery doesn't have userID)

        uint256 userIDFromAuthResponse;
        AuthTypeData storage authTypeData = $._authMethods[authResponse.authType];

        bytes32 expectedNonce = keccak256(abi.encode(sender, responses));

        // Authenticate user
        userIDFromAuthResponse = authTypeData.validator.verify(
            authResponse.proof,
            authTypeData.params,
            sender,
            $._state,
            expectedNonce
        );

        if (userIDFromAuthResponse == 0) {
            revert UserNotAuthenticated();
        }

        // 3. Verify all the responses, check userID from signals and write proof results,
        //      emit events (existing logic)
        for (uint256 i = 0; i < responses.length; i++) {
            IVerifier.Response memory response = responses[i];
            IVerifier.RequestData storage request = _getRequestIfCanBeVerified(response.requestId);

            IRequestValidator.ResponseField[] memory signals = request.validator.verify(
                response.proof,
                request.params,
                sender,
                $._state
            );

            // Check if userID from authResponse is the same as the one in the signals
            _checkUserIDMatch(userIDFromAuthResponse, signals);

            // Check that response fields are not repeated
            _checkSinals(signals);

            $.writeProofResults(response.requestId, sender, signals);

            if (response.metadata.length > 0) {
                revert MetadataNotSupportedYet();
            }
        }
    }

    function _checkUserIDMatch(
        uint256 userIDFromAuthResponse,
        IRequestValidator.ResponseField[] memory signals
    ) internal pure {
        for (uint256 j = 0; j < signals.length; j++) {
            if (
                keccak256(abi.encodePacked(signals[j].name)) ==
                keccak256(abi.encodePacked("userID"))
            ) {
                if (userIDFromAuthResponse != signals[j].value) {
                    revert UserIDMismatch(userIDFromAuthResponse, signals[j].value);
                }
            }
        }
    }

    function _checkSinals(IRequestValidator.ResponseField[] memory signals) internal pure {
        for (uint256 j = 0; j < signals.length; j++) {
            for (uint256 k = j + 1; k < signals.length; k++) {
                if (
                    keccak256(abi.encodePacked(signals[j].name)) ==
                    keccak256(abi.encodePacked(signals[k].name))
                ) {
                    revert ResponseFieldAlreadyExists(signals[j].name);
                }
            }
        }
    }

    /**
     * @dev Updates a request
     * @param request The request data
     */
    function _updateRequest(
        IVerifier.Request calldata request
    ) internal checkRequestExistence(request.requestId, true) {
        VerifierStorage storage s = _getVerifierStorage();
        IRequestValidator.RequestParams memory requestParams = request.validator.getRequestParams(
            request.params
        );

        s._requests[request.requestId] = IVerifier.RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params,
            creator: _msgSender(),
            verifierId: requestParams.verifierID
        });
    }

    /**
     * @dev Sets an auth type
     * @param authType The auth type to add
     */
    function setAuthType(
        IVerifier.AuthType calldata authType
    ) public virtual checkAuthTypeExistence(authType.authType, false) {
        VerifierStorage storage s = _getVerifierStorage();
        s._authTypes.push(authType.authType);
        s._authMethods[authType.authType] = AuthTypeData({
            validator: authType.validator,
            params: authType.params,
            isActive: true
        });
    }

    /**
     * @dev Disables an auth type
     * @param authType The auth type to disable
     */
    function disableAuthType(
        string calldata authType
    ) public checkAuthTypeExistence(authType, true) {
        VerifierStorage storage s = _getVerifierStorage();
        s._authMethods[authType].isActive = false;
    }

    /**
     * @dev Enables an auth type
     * @param authType The auth type to enable
     */
    function enableAuthType(
        string calldata authType
    ) public checkAuthTypeExistence(authType, true) {
        VerifierStorage storage s = _getVerifierStorage();
        s._authMethods[authType].isActive = true;
    }

    /**
     * @dev Gets an auth type
     * @param authType The Id of the auth type to get
     * @return authMethod The auth type data
     */
    function getAuthType(
        string calldata authType
    ) public view checkAuthTypeExistence(authType, true) returns (AuthTypeData memory authMethod) {
        return _getVerifierStorage()._authMethods[authType];
    }

    /**
     * @dev Gets response field value
     * @param requestId Id of the request
     * @param sender Address of the user
     * @param responseFieldName Name of the response field to get
     */
    function getResponseFieldValue(
        uint256 requestId,
        address sender,
        string memory responseFieldName
    ) public view checkRequestExistence(requestId, true) returns (uint256) {
        VerifierStorage storage s = _getVerifierStorage();
        return s._proofs[requestId][sender].storageFields[responseFieldName];
    }

    function _checkLinkedResponseFields(
        uint256 multiRequestId,
        address sender
    ) internal view returns (bool) {
        VerifierStorage storage s = _getVerifierStorage();

        for (uint256 i = 0; i < s._multiRequests[multiRequestId].groupIds.length; i++) {
            uint256 groupId = s._multiRequests[multiRequestId].groupIds[i];

            // Check linkID in the same group or requests is the same
            uint256 requestLinkID = getResponseFieldValue(
                s._groupedRequests[groupId][0],
                sender,
                LINKED_PROOF_KEY
            );
            for (uint256 j = 1; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestLinkIDToCompare = getResponseFieldValue(
                    s._groupedRequests[groupId][j],
                    sender,
                    LINKED_PROOF_KEY
                );
                if (requestLinkID != requestLinkIDToCompare) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * @dev Gets the status of the multiRequest verification
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function getMultiRequestStatus(
        uint256 multiRequestId,
        address userAddress
    )
        public
        view
        checkMultiRequestExistence(multiRequestId, true)
        returns (IVerifier.RequestStatus[] memory)
    {
        // 1. Check if all requests statuses are true for the userAddress
        IVerifier.RequestStatus[] memory requestStatus = _getMultiRequestStatus(
            multiRequestId,
            userAddress
        );

        // 2. Check if all linked response fields are the same
        bool linkedResponsesOK = _checkLinkedResponseFields(multiRequestId, userAddress);

        if (!linkedResponsesOK) {
            revert LinkIDNotTheSameForGroupedRequests();
        }

        return requestStatus;
    }

    /**
     * @dev Checks if the proofs from a Multirequest submitted for a given sender and request ID are verified
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function isMultiRequestVerified(
        uint256 multiRequestId,
        address userAddress
    ) public view checkMultiRequestExistence(multiRequestId, true) returns (bool) {
        // 1. Check if all requests are verified for the userAddress
        bool verified = _isMultiRequestVerified(multiRequestId, userAddress);

        if (verified) {
            // 2. Check if all linked response fields are the same
            bool linkedResponsesOK = _checkLinkedResponseFields(multiRequestId, userAddress);

            if (!linkedResponsesOK) {
                verified = false;
            }
        }

        return verified;
    }

    function _getMultiRequestStatus(
        uint256 multiRequestId,
        address userAddress
    ) internal view returns (IVerifier.RequestStatus[] memory) {
        VerifierStorage storage s = _getVerifierStorage();
        IVerifier.MultiRequest storage multiRequest = s._multiRequests[multiRequestId];

        uint256 lengthGroupIds;

        if (multiRequest.groupIds.length > 0) {
            for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
                uint256 groupId = multiRequest.groupIds[i];
                lengthGroupIds += s._groupedRequests[groupId].length;
            }
        }

        IVerifier.RequestStatus[] memory requestStatus = new IVerifier.RequestStatus[](
            multiRequest.requestIds.length + lengthGroupIds
        );

        for (uint256 i = 0; i < multiRequest.requestIds.length; i++) {
            uint256 requestId = multiRequest.requestIds[i];

            requestStatus[i] = IVerifier.RequestStatus({
                requestId: requestId,
                isVerified: s._proofs[requestId][userAddress].isVerified,
                validatorVersion: s._proofs[requestId][userAddress].validatorVersion,
                timestamp: s._proofs[requestId][userAddress].blockTimestamp
            });
        }

        for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
            uint256 groupId = multiRequest.groupIds[i];

            for (uint256 j = 0; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestId = s._groupedRequests[groupId][j];

                requestStatus[multiRequest.requestIds.length + j] = IVerifier.RequestStatus({
                    requestId: requestId,
                    isVerified: s._proofs[requestId][userAddress].isVerified,
                    validatorVersion: s._proofs[requestId][userAddress].validatorVersion,
                    timestamp: s._proofs[requestId][userAddress].blockTimestamp
                });
            }
        }

        return requestStatus;
    }

    function _isMultiRequestVerified(
        uint256 multiRequestId,
        address userAddress
    ) internal view returns (bool) {
        VerifierStorage storage s = _getVerifierStorage();
        IVerifier.MultiRequest storage multiRequest = s._multiRequests[multiRequestId];

        for (uint256 i = 0; i < multiRequest.requestIds.length; i++) {
            uint256 requestId = multiRequest.requestIds[i];

            if (!s._proofs[requestId][userAddress].isVerified) {
                return false;
            }
        }

        for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
            uint256 groupId = multiRequest.groupIds[i];

            for (uint256 j = 0; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestId = s._groupedRequests[groupId][j];

                if (!s._proofs[requestId][userAddress].isVerified) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * @dev Checks if a proof from a request submitted for a given sender and request ID is verified
     * @param sender The sender's address
     * @param requestId The ID of the request
     * @return True if proof is verified
     */
    function isRequestVerified(
        address sender,
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (bool) {
        VerifierStorage storage s = _getVerifierStorage();
        return s._proofs[requestId][sender].isVerified;
    }

    /**
     * @dev Get the requests count.
     * @return Requests count.
     */
    function getRequestsCount() public view returns (uint256) {
        return _getVerifierStorage()._requestIds.length;
    }

    /**
     * @dev Gets the address of the state contract linked to the verifier
     * @return address State contract address
     */
    function getStateAddress() public view virtual returns (address) {
        return address(_getVerifierStorage()._state);
    }

    /**
     * @dev Gets the verifierID of the verifier contract
     * @return uint256 verifierID of the verifier contract
     */
    function getVerifierID() public view virtual returns (uint256) {
        return _getVerifierStorage()._verifierID;
    }

    /**
     * @dev Checks the proof status for a given user and request ID
     * @param sender The sender's address
     * @param requestId The ID of the ZKP request
     * @return The proof status structure
     */
    function getRequestStatus(
        address sender,
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (IVerifier.RequestStatus memory) {
        VerifierStorage storage s = _getVerifierStorage();
        VerifierLib.Proof storage proof = s._proofs[requestId][sender];

        return
            IVerifier.RequestStatus(
                requestId,
                proof.isVerified,
                proof.validatorVersion,
                proof.blockTimestamp
            );
    }

    function _getRequestIfCanBeVerified(
        uint256 requestId
    )
        internal
        view
        virtual
        checkRequestExistence(requestId, true)
        returns (IVerifier.RequestData storage)
    {
        VerifierStorage storage $ = _getVerifierStorage();
        return $._requests[requestId];
    }
}
