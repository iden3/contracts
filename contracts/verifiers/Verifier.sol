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
error QueryIdNotFound(uint256 queryId);
error QueryIdAlreadyExists(uint256 queryId);
error AuthTypeNotFound(string authType);
error AuthTypeAlreadyExists(string authType);
error ValidatorNotWhitelisted(address validator);
error RequestIsAlreadyGrouped(uint256 requestId);
error AuthResponsesExactlyOneRequired();
error LinkIDNotTheSameForGroupedRequests(uint256 requestLinkID, uint256 requestLinkIDToCompare);
error UserIDNotFound(uint256 userID);
error UserIDNotLinkedToAddress(uint256 userID, address userAddress);
error ValidatorNotSupportInterface(address validator);

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
        // Information about queries
        mapping(uint256 queryId => Query) _queries;
        uint256[] _queryIds;
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
        uint256 groupId = request.validator.getGroupID(request.params);

        if (groupId != 0) {
            if (existence) {
                if (!groupIdExists(groupId)) {
                    revert GroupIdNotFound(groupId);
                }
            } else {
                if (groupIdExists(groupId)) {
                    revert GroupIdAlreadyExists(groupId);
                }
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the query exists
     */
    modifier checkQueryExistence(uint256 queryId, bool existence) {
        if (existence) {
            if (!queryIdExists(queryId)) {
                revert QueryIdNotFound(queryId);
            }
        } else {
            if (queryIdExists(queryId)) {
                revert QueryIdAlreadyExists(queryId);
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
     * @dev Checks if a query ID exists
     * @param queryId The ID of the query
     * @return Whether the query ID exists
     */
    function queryIdExists(uint256 queryId) public view returns (bool) {
        return _getVerifierStorage()._queries[queryId].queryId == queryId;
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
    ) internal checkRequestExistence(request.requestId, false) {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 verifierId = request.validator.getVerifierId(request.params);

        s._requests[request.requestId] = IVerifier.RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params,
            creator: _msgSender(),
            verifierId: verifierId
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
    ) public virtual {
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
     * @dev Sets a query
     * @param queryId The ID of the query
     * @param query The query data
     */
    function setQuery(
        uint256 queryId,
        IVerifier.Query calldata query
    ) public virtual checkQueryExistence(queryId, false) {
        VerifierStorage storage s = _getVerifierStorage();
        s._queries[queryId] = query;
        s._queryIds.push(queryId);

        // checks for all the requests in this query
        _checkRequestsInQuery(queryId);
    }

    /**
     * @dev Gets a specific multi query by ID
     * @param queryId The ID of the multi query
     * @return query The query data
     */
    function getQuery(uint256 queryId) public view returns (IVerifier.Query memory query) {
        return _getVerifierStorage()._queries[queryId];
    }

    function _checkRequestsInQuery(uint256 queryId) internal view {
        VerifierStorage storage s = _getVerifierStorage();

        uint256[] memory requestIds = s._queries[queryId].requestIds;

        // check that all the single requests doesn't have group
        for (uint256 i = 0; i < requestIds.length; i++) {
            if (
                s._requests[requestIds[i]].validator.getGroupID(
                    s._requests[requestIds[i]].params
                ) != 0
            ) {
                revert RequestIsAlreadyGrouped(requestIds[i]);
            }
        }
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param authResponses The list of auth responses including auth type and proof
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses,
        bytes memory crossChainProofs
    ) public virtual {
        VerifierStorage storage $ = _getVerifierStorage();
        address sender = _msgSender();

        // 1. Process crossChainProofs
        $._state.processCrossChainProofs(crossChainProofs);

        // TODO: Get userID from responses that has userID informed (LinkedMultiquery doesn't have userID)

        // 2. Process auth response first
        if (authResponses.length != 1) {
            // TODO: Check if it's already authenticated or it's an ethereum identity
            revert AuthResponsesExactlyOneRequired();
        }

        uint256 userIDFromReponse;
        AuthTypeData storage authTypeData = $._authMethods[authResponses[0].authType];
        // Authenticate user
        IAuthValidator.ResponseField[] memory authSignals = authTypeData.validator.verify(
            authResponses[0].proof,
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
            $.writeAuthProofResults(authResponses[0].authType, userIDFromReponse, authSignals);
            // Link userID and user address
            $._user_address_to_id[sender] = userIDFromReponse;
            $._id_to_user_address[userIDFromReponse] = sender;
            $._user_auth_timestamp[userIDFromReponse][sender] = block.timestamp;
        }

        // 3. Get userID from latest auth response processed in this submitResponse or before
        uint256 userID = $._user_address_to_id[sender];

        if (userID == 0) {
            revert("The user is not authenticated");
        }

        // 4. Verify all the single responses, write proof results (under the userID key from the auth of the user),
        //      emit events (existing logic)
        for (uint256 i = 0; i < singleResponses.length; i++) {
            IVerifier.Response memory response = singleResponses[i];
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

        // 5. Verify all the grouped responses, write proof results (under the userID key from the auth of the user),
        //      emit events (existing logic)
        _verifyGroupedResponses(groupedResponses, userID, sender);
    }

    /**
     * @dev Updates a request
     * @param request The request data
     */
    function _updateRequest(
        IVerifier.Request calldata request
    ) internal checkRequestExistence(request.requestId, true) {
        VerifierStorage storage s = _getVerifierStorage();
        uint256 verifierId = request.validator.getVerifierId(request.params);

        s._requests[request.requestId] = IVerifier.RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params,
            creator: _msgSender(),
            verifierId: verifierId
        });
    }

    function _verifyGroupedResponses(
        IVerifier.GroupedResponses[] memory groupedResponses,
        uint256 userID,
        address sender
    ) internal {
        VerifierStorage storage $ = _getVerifierStorage();

        for (uint256 i = 0; i < groupedResponses.length; i++) {
            for (uint256 j = 0; j < groupedResponses[i].responses.length; j++) {
                IVerifier.Response memory response = groupedResponses[i].responses[j];
                IVerifier.RequestData storage request = $._requests[response.requestId];

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

    function _checkLinkedResponseFields(uint256 queryId, uint256 userID) internal view {
        VerifierStorage storage s = _getVerifierStorage();

        for (uint256 i = 0; i < s._queries[queryId].groupIds.length; i++) {
            uint256 groupId = s._queries[queryId].groupIds[i];

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
     * @dev Gets the status of the query verification
     * @param queryId The ID of the query
     * @param userAddress The address of the user
     * @return status The status of the query. "True" if all requests are verified, "false" otherwise
     */
    function getQueryStatus(
        uint256 queryId,
        address userAddress
    )
        public
        view
        checkQueryExistence(queryId, true)
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
        ) = _getQueryStatus(queryId, userID);

        // 3. Check if all linked response fields are the same
        _checkLinkedResponseFields(queryId, userID);

        return (authProofStatus, requestProofStatus);
    }

    /**
     * @dev Gets the status of the query verification
     * @param queryId The ID of the query
     * @param userAddress The address of the user
     * @param userID The user id of the user
     * @return status The status of the query. "True" if all requests are verified, "false" otherwise
     */
    function getQueryStatus(
        uint256 queryId,
        address userAddress,
        uint256 userID
    )
        public
        view
        checkQueryExistence(queryId, true)
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
        ) = _getQueryStatus(queryId, userIDSelected);

        // 3. Check if all linked response fields are the same
        _checkLinkedResponseFields(queryId, userIDSelected);

        return (authProofStatus, requestProofStatus);
    }

    function _getQueryStatus(
        uint256 queryId,
        uint256 userID
    )
        internal
        view
        returns (IVerifier.AuthProofStatus[] memory, IVerifier.RequestProofStatus[] memory)
    {
        VerifierStorage storage s = _getVerifierStorage();
        Query storage query = s._queries[queryId];

        uint256 lengthGroupIds;

        if (query.groupIds.length > 0) {
            for (uint256 i = 0; i < query.groupIds.length; i++) {
                uint256 groupId = query.groupIds[i];
                lengthGroupIds += s._groupedRequests[groupId].length;
            }
        }

        IVerifier.AuthProofStatus[] memory authProofStatus = new IVerifier.AuthProofStatus[](
            s._authTypes.length
        );
        IVerifier.RequestProofStatus[]
            memory requestProofStatus = new IVerifier.RequestProofStatus[](
                query.requestIds.length + lengthGroupIds
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

        for (uint256 i = 0; i < query.requestIds.length; i++) {
            uint256 requestId = query.requestIds[i];

            requestProofStatus[i] = IVerifier.RequestProofStatus({
                requestId: requestId,
                isVerified: s._proofs[requestId][userID][0].isVerified,
                validatorVersion: s._proofs[requestId][userID][0].validatorVersion,
                timestamp: s._proofs[requestId][userID][0].blockTimestamp
            });
        }

        for (uint256 i = 0; i < query.groupIds.length; i++) {
            uint256 groupId = query.groupIds[i];

            for (uint256 j = 0; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestId = s._groupedRequests[groupId][j];

                requestProofStatus[query.requestIds.length + j] = IVerifier.RequestProofStatus({
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
