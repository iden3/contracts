// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {VerifierLib} from "../lib/VerifierLib.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

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
error LinkIDNotTheSameForGroupedRequests(uint256 requestLinkID, uint256 requestLinkIDToCompare);
error UserIDNotFound(uint256 userID);
error UserIDNotLinkedToAddress(uint256 userID, address userAddress);

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
        mapping(uint256 requestId => mapping(uint256 userID => VerifierLib.Proof[])) _proofs;
        mapping(uint256 requestId => IVerifier.RequestData) _requests;
        uint256[] _requestIds;
        mapping(uint256 groupId => uint256[] requestIds) _groupedRequests;
        uint256[] _groupIds;
        IState _state;
        // Information about multiRequests
        mapping(uint256 multiRequestId => IVerifier.MultiRequest) _multiRequests;
        uint256[] _multiRequestIds;
        // Information linked between users and their addresses
        mapping(address userAddress => uint256 userID) _user_address_to_id;
        mapping(uint256 userID => address userAddress) _id_to_user_address;
        mapping(uint256 userID => mapping(address userAddress => uint256 timestamp)) _user_auth_timestamp;
        // Whitelisted validators
        mapping(IRequestValidator => bool isApproved) _validatorWhitelist;
        // Information about auth types and validators
        string[] _authTypes;
        mapping(string authType => AuthTypeData) _authMethods;
        mapping(string authType => mapping(uint256 userID => VerifierLib.AuthProof[])) _authProofs;
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
    }

    function _getVerifierStorage() private pure returns (VerifierStorage storage $) {
        assembly {
            $.slot := VerifierStorageLocation
        }
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
        return
            _getVerifierStorage()._groupIds.length > 0 &&
            _getVerifierStorage()._groupIds[groupId] != 0;
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
     * @param singleRequests The requests that are not in any group
     * @param groupedRequests The requests that are in a group
     */
    function setRequests(
        Request[] calldata singleRequests,
        GroupedRequests[] calldata groupedRequests
    ) public {
        VerifierStorage storage s = _getVerifierStorage();

        for (uint256 i = 0; i < singleRequests.length; i++) {
            _setRequestWithChecks(singleRequests[i]);
        }
        for (uint256 i = 0; i < groupedRequests.length; i++) {
            if (groupIdExists(groupedRequests[i].groupId)) {
                revert("Group ID already exists");
            }
            s._groupIds.push(groupedRequests[i].groupId);

            for (uint256 j = 0; j < groupedRequests[i].requests.length; j++) {
                _setRequest(groupedRequests[i].requests[j]);
                s._groupedRequests[groupedRequests[i].groupId].push(
                    groupedRequests[i].requests[j].requestId
                );
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
            RequestInfo({
                requestId: requestId,
                metadata: rd.metadata,
                validator: rd.validator,
                params: rd.params,
                creator: rd.creator,
                verifierId: rd.verifierId,
                isVerifierAuthenticated: $._user_auth_timestamp[rd.verifierId][rd.creator] != 0
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

        uint256 userIDFromReponse;
        AuthTypeData storage authTypeData = $._authMethods[authResponse.authType];
        // Authenticate user
        IAuthValidator.ResponseField[] memory authSignals = authTypeData.validator.verify(
            authResponse.proof,
            authTypeData.params,
            sender,
            $._state
        );

        for (uint256 j = 0; j < authSignals.length; j++) {
            if (keccak256(bytes(authSignals[j].name)) == keccak256(bytes("userID"))) {
                userIDFromReponse = authSignals[j].value;
                break;
            }
        }

        // For some reason the auth request doesn't return the userID in the response
        if (userIDFromReponse != 0) {
            $.writeAuthProofResults(authResponse.authType, userIDFromReponse, authSignals);
            // Link userID and user address
            $._user_address_to_id[sender] = userIDFromReponse;
            $._id_to_user_address[userIDFromReponse] = sender;
            $._user_auth_timestamp[userIDFromReponse][sender] = block.timestamp;
        }

        // 2. Get userID from latest auth response processed in this submitResponse or before
        uint256 userID = $._user_address_to_id[sender];

        if (userID == 0) {
            revert("The user is not authenticated");
        }

        // 3. Verify all the responses, write proof results (under the userID key from the auth of the user),
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

            $.writeProofResults(response.requestId, userID, signals);

            if (response.metadata.length > 0) {
                revert("Metadata not supported yet");
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
     * @param userID Id of the user
     * @param responseFieldName Name of the response field to get
     */
    function getResponseFieldValue(
        uint256 requestId,
        uint256 userID,
        string memory responseFieldName
    ) public view checkRequestExistence(requestId, true) returns (uint256) {
        VerifierStorage storage s = _getVerifierStorage();
        return s._proofs[requestId][userID][0].storageFields[responseFieldName];
    }

    /**
     * @dev Gets response field value
     * @param requestId Id of the request
     * @param sender Address of the sender
     * @param responseFieldName Name of the response field to get
     */
    function getResponseFieldValueFromAddress(
        uint256 requestId,
        address sender,
        string memory responseFieldName
    ) public view checkRequestExistence(requestId, true) returns (uint256) {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 userID = s._user_address_to_id[sender];
        return s._proofs[requestId][userID][0].storageFields[responseFieldName];
    }

    /**
     * @dev Gets response field value
     * @param authType Auth type of the proof response
     * @param sender Address of the sender
     * @param responseFieldName Name of the response field to get
     */
    function getAuthResponseFieldValueFromAddress(
        string memory authType,
        address sender,
        string memory responseFieldName
    ) public view checkAuthTypeExistence(authType, true) returns (uint256) {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 userID = s._user_address_to_id[sender];
        return s._authProofs[authType][userID][0].storageFields[responseFieldName];
    }

    function _checkLinkedResponseFields(uint256 multiRequestId, uint256 userID) internal view {
        VerifierStorage storage s = _getVerifierStorage();

        for (uint256 i = 0; i < s._multiRequests[multiRequestId].groupIds.length; i++) {
            uint256 groupId = s._multiRequests[multiRequestId].groupIds[i];

            // Check linkID in the same group or requests is the same
            uint256 requestLinkID = getResponseFieldValue(
                s._groupedRequests[groupId][0],
                userID,
                LINKED_PROOF_KEY
            );
            for (uint256 j = 1; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestLinkIDToCompare = getResponseFieldValue(
                    s._groupedRequests[groupId][j],
                    userID,
                    LINKED_PROOF_KEY
                );
                if (requestLinkID != requestLinkIDToCompare) {
                    revert LinkIDNotTheSameForGroupedRequests(
                        requestLinkID,
                        requestLinkIDToCompare
                    );
                }
            }
        }
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
        returns (IVerifier.AuthProofStatus[] memory, IVerifier.RequestProofStatus[] memory)
    {
        VerifierStorage storage s = _getVerifierStorage();

        // 1. Get the latest userId by the userAddress arg (in the mapping)
        uint256 userID = s._user_address_to_id[userAddress];
        if (userID == 0) {
            revert UserIDNotFound(userID);
        }

        // 2. Check if all requests statuses are true for the userId
        (
            IVerifier.AuthProofStatus[] memory authProofStatus,
            IVerifier.RequestProofStatus[] memory requestProofStatus
        ) = _getMultiRequestStatus(multiRequestId, userID);

        // 3. Check if all linked response fields are the same
        _checkLinkedResponseFields(multiRequestId, userID);

        return (authProofStatus, requestProofStatus);
    }

    /**
     * @dev Gets the status of the multiRequest verification
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @param userID The user id of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function getMultiRequestStatus(
        uint256 multiRequestId,
        address userAddress,
        uint256 userID
    )
        public
        view
        checkMultiRequestExistence(multiRequestId, true)
        returns (IVerifier.AuthProofStatus[] memory, IVerifier.RequestProofStatus[] memory)
    {
        VerifierStorage storage s = _getVerifierStorage();

        // 1. Get the latest userId by the userAddress arg (in the mapping)
        uint256 userIDFromAddress = s._user_address_to_id[userAddress];
        uint256 userIDSelected;

        if (userIDFromAddress != userID) {
            address addressFromUserID = s._id_to_user_address[userID];
            if (addressFromUserID != userAddress) {
                revert UserIDNotLinkedToAddress(userID, userAddress);
            }
            userIDSelected = s._user_address_to_id[addressFromUserID];
        } else {
            userIDSelected = userID;
        }

        // 2. Check if all requests statuses are true for the userId
        (
            IVerifier.AuthProofStatus[] memory authProofStatus,
            IVerifier.RequestProofStatus[] memory requestProofStatus
        ) = _getMultiRequestStatus(multiRequestId, userIDSelected);

        // 3. Check if all linked response fields are the same
        _checkLinkedResponseFields(multiRequestId, userIDSelected);

        return (authProofStatus, requestProofStatus);
    }

    function _getMultiRequestStatus(
        uint256 multiRequestId,
        uint256 userID
    )
        internal
        view
        returns (IVerifier.AuthProofStatus[] memory, IVerifier.RequestProofStatus[] memory)
    {
        VerifierStorage storage s = _getVerifierStorage();
        IVerifier.MultiRequest storage multiRequest = s._multiRequests[multiRequestId];

        uint256 lengthGroupIds;

        if (multiRequest.groupIds.length > 0) {
            for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
                uint256 groupId = multiRequest.groupIds[i];
                lengthGroupIds += s._groupedRequests[groupId].length;
            }
        }

        IVerifier.AuthProofStatus[] memory authProofStatus = new IVerifier.AuthProofStatus[](
            s._authTypes.length
        );
        IVerifier.RequestProofStatus[]
            memory requestProofStatus = new IVerifier.RequestProofStatus[](
                multiRequest.requestIds.length + lengthGroupIds
            );

        for (uint256 i = 0; i < s._authTypes.length; i++) {
            string memory authType = s._authTypes[i];
            authProofStatus[i] = IVerifier.AuthProofStatus({
                authType: authType,
                isVerified: s._authProofs[authType][userID][0].isVerified,
                validatorVersion: s._authProofs[authType][userID][0].validatorVersion,
                timestamp: s._authProofs[authType][userID][0].blockTimestamp
            });
        }

        for (uint256 i = 0; i < multiRequest.requestIds.length; i++) {
            uint256 requestId = multiRequest.requestIds[i];

            requestProofStatus[i] = IVerifier.RequestProofStatus({
                requestId: requestId,
                isVerified: s._proofs[requestId][userID][0].isVerified,
                validatorVersion: s._proofs[requestId][userID][0].validatorVersion,
                timestamp: s._proofs[requestId][userID][0].blockTimestamp
            });
        }

        for (uint256 i = 0; i < multiRequest.groupIds.length; i++) {
            uint256 groupId = multiRequest.groupIds[i];

            for (uint256 j = 0; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestId = s._groupedRequests[groupId][j];

                requestProofStatus[multiRequest.requestIds.length + j] = IVerifier
                    .RequestProofStatus({
                        requestId: requestId,
                        isVerified: s._proofs[requestId][userID][0].isVerified,
                        validatorVersion: s._proofs[requestId][userID][0].validatorVersion,
                        timestamp: s._proofs[requestId][userID][0].blockTimestamp
                    });
            }
        }

        return (authProofStatus, requestProofStatus);
    }

    /**
     * @dev Checks if a proof submitted for a given sender and request ID is verified
     * @param sender The sender's address
     * @param requestId The ID of the request
     * @return True if proof is verified
     */
    function isProofVerified(
        address sender,
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (bool) {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 userID = s._user_address_to_id[sender];
        return s._proofs[requestId][userID][0].isVerified;
    }

    /**
     * @dev Checks if a user is authenticated
     * @param userID The ID of the user
     * @param userAddress The address of the user
     * @return Whether the user is authenticated
     */
    function isUserAuth(uint256 userID, address userAddress) public view returns (bool) {
        VerifierStorage storage s = _getVerifierStorage();
        return s._user_auth_timestamp[userID][userAddress] != 0;
    }

    /**
     * @dev Gets the timestamp of the authentication of a user
     * @param userID The user id of the user
     * @param userAddress The address of the user
     * @return The user ID
     */
    function userAuthTimestamp(uint256 userID, address userAddress) public view returns (uint256) {
        if (isUserAuth(userID, userAddress)) {
            VerifierStorage storage s = _getVerifierStorage();

            return s._user_auth_timestamp[userID][userAddress];
        } else {
            return 0;
        }
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
     * @dev Checks the proof status for a given user and request ID
     * @param sender The sender's address
     * @param requestId The ID of the ZKP request
     * @return The proof status structure
     */
    function getProofStatus(
        address sender,
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (IVerifier.ProofStatus memory) {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 userID = s._user_address_to_id[sender];
        VerifierLib.Proof storage proof = s._proofs[requestId][userID][0];

        return
            IVerifier.ProofStatus(proof.isVerified, proof.validatorVersion, proof.blockTimestamp);
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
