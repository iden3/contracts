// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";
import {IState} from "../interfaces/IState.sol";

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

contract UniversalVerifierMultiQuery is Ownable2StepUpgradeable {
    /**
     * @dev Version of the contract
     */
    string public constant VERSION = "1.0.0";
    /// @dev Key to retrieve the linkID from the proof storage
    string constant LINKED_PROOF_KEY = "linkID";

    /**
     * @dev Request. Structure for request for storage.
     * @param metadata Metadata of the request.
     * @param validator Validator circuit.
     * @param params Params of the request. Proof parameters could be ZK groth16, plonk, ESDSA, EIP712, etc.
     */
    struct RequestData {
        string metadata;
        IRequestValidator validator;
        bytes params;
    }

    struct Request {
        uint256 requestId;
        string metadata;
        IRequestValidator validator;
        bytes params;
    }

    struct GroupedRequests {
        uint256 groupId;
        Request[] requests;
    }

    /**
     * @dev Struct to store proof and associated data
     */
    struct Proof {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        // TODO: discuss if we need this field
        // uint256 blockNumber;
        uint256 blockTimestamp;
        mapping(string key => bytes) metadata;
        // This empty reserved space is put in place to allow future versions
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
    }

    /**
     * @dev Struct to store auth proof and associated data
     */
    struct AuthProof {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        uint256 blockTimestamp;
        // This empty reserved space is put in place to allow future versions
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
    }

    //TODO: custom errors to save some gas.

    /**
     * @dev Response. Structure for response.
     * @param requestId Request id of the request.
     * @param proof proof to verify.
     * @param metadata Metadata of the request.
     */
    struct Response {
        uint256 requestId;
        bytes proof;
        bytes metadata;
    }

    struct AuthType {
        string authType;
        IAuthValidator validator;
        bytes params;
    }

    struct AuthTypeData {
        IAuthValidator validator;
        bytes params;
        bool isActive;
    }
    struct AuthResponse {
        string authType; //zkp-auth-v2, zkp-auth-v3, etc. will deside later
        bytes proof;
    }

    struct RequestProofStatus {
        uint256 requestId;
        bool isVerified;
        string validatorVersion;
        uint256 timestamp;
    }
    struct AuthProofStatus {
        string authType;
        bool isVerified;
        string validatorVersion;
        uint256 timestamp;
    }

    struct GroupedResponses {
        uint256 groupId;
        Response[] responses;
    }

    struct UserAddressToIdInfo {
        uint256 userID;
        uint256 timestamp;
    }

    struct UserIdToAddressInfo {
        address userAddress;
        uint256 timestamp;
    }

    /**
     * @dev Query. Structure for query.
     * @param queryId Query id.
     * @param requestIds Request ids for this multi query (without groupId. Single requests).
     * @param groupIds Group ids for this multi query (all the requests included in the group. Grouped requests).
     * @param metadata Metadata for the query. Empty in first version.
     */
    struct Query {
        uint256 queryId;
        uint256[] requestIds;
        uint256[] groupIds;
        bytes metadata;
    }

    /// @custom:storage-location erc7201:iden3.storage.UniversalVerifierMultiQuery
    struct UniversalVerifierMultiQueryStorage {
        // Information about requests
        // solhint-disable-next-line
        mapping(uint256 requestId => mapping(uint256 userID => Proof[])) _proofs;
        mapping(uint256 requestId => RequestData) _requests;
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
        mapping(string authType => mapping(uint256 userID => AuthProof[])) _authProofs;
    }

    // solhint-disable-next-line
    // keccak256(abi.encode(uint256(keccak256("iden3.storage.UniversalVerifierMultiQuery")) -1 )) & ~bytes32(uint256(0xff));
    bytes32 internal constant UniversalVerifierMultiQueryStorageLocation =
        0x4235c64ddf027641dd9aa586d246e4cc3acfcb3f7016a8aa68f7ac21d38b3b00;

    /**
     * @dev Event emitted upon submitting a request
     */
    event ResponseSubmitted(uint256 indexed requestId, address indexed caller);

    /**
     * @dev Event emitted upon submitting an auth response
     */
    event AuthResponseSubmitted(string indexed authType, address indexed caller);

    /**
     * @dev Event emitted upon adding a request
     */
    event RequestSet(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes params
    );

    /**
     * @dev Event emitted upon adding an auth type by the owner
     */
    event AuthTypeSet(string indexed authType, address validator, bytes params);

    /**
     * @dev Event emitted upon updating a request
     */
    event RequestUpdate(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes params
    );

    /**
     * @dev Event emitted upon adding a query
     */
    event QuerySet(uint256 indexed queryId, uint256[] requestIds);

    /**
     * @dev Event emitted upon updating a query
     */
    event QueryUpdate(uint256 indexed queryId, uint256[] requestIds);

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

        if (existence) {
            if (!groupIdExists(groupId)) {
                revert GroupIdNotFound(groupId);
            }
        } else {
            if (groupIdExists(groupId)) {
                revert GroupIdAlreadyExists(groupId);
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

    /**
     * @dev Modifier to check if the validator is whitelisted
     */
    modifier onlyWhitelistedValidator(IRequestValidator validator) {
        if (!isWhitelistedValidator(validator)) {
            revert ValidatorNotWhitelisted(address(validator));
        }
        _;
    }

    /**
     * @dev Initializes the contract
     * @param state The state contract
     * @param owner The owner of the contract
     */
    function initialize(IState state, address owner) public initializer {
        __Ownable_init(owner);
        _getUniversalVerifierMultiQueryStorage()._state = state;
    }

    function _getUniversalVerifierMultiQueryStorage()
        private
        pure
        returns (UniversalVerifierMultiQueryStorage storage $)
    {
        assembly {
            $.slot := UniversalVerifierMultiQueryStorageLocation
        }
    }

    /**
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return Whether the request ID exists
     */
    function requestIdExists(uint256 requestId) public view returns (bool) {
        return
            _getUniversalVerifierMultiQueryStorage()._requests[requestId].validator !=
            IRequestValidator(address(0));
    }

    /**
     * @dev Checks if a group ID exists
     * @param groupId The ID of the group
     * @return Whether the group ID exists
     */
    function groupIdExists(uint256 groupId) public view returns (bool) {
        return
            _getUniversalVerifierMultiQueryStorage()._groupIds.length > 0 &&
            _getUniversalVerifierMultiQueryStorage()._groupIds[groupId] != 0;
    }

    /**
     * @dev Checks if a query ID exists
     * @param queryId The ID of the query
     * @return Whether the query ID exists
     */
    function queryIdExists(uint256 queryId) public view returns (bool) {
        return _getUniversalVerifierMultiQueryStorage()._queries[queryId].queryId == queryId;
    }

    /**
     * @dev Checks if an auth type exists
     * @param authType The auth type
     * @return Whether the auth type exists
     */
    function authTypeExists(string memory authType) public view returns (bool) {
        return _getUniversalVerifierMultiQueryStorage()._authMethods[authType].isActive == true;
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
        onlyWhitelistedValidator(request.validator)
    {
        _setRequest(request);
    }

    function _setRequest(
        Request calldata request
    ) internal checkRequestExistence(request.requestId, false) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._requests[request.requestId] = RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params
        });
        s._requestIds.push(request.requestId);

        emit RequestSet(
            request.requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.params
        );
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
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

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
     * @return request The request data
     */
    function getRequest(
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (RequestData memory request) {
        return _getUniversalVerifierMultiQueryStorage()._requests[requestId];
    }

    /**
     * @dev Sets a query
     * @param queryId The ID of the query
     * @param query The query data
     */
    function setQuery(
        uint256 queryId,
        Query calldata query
    ) public checkQueryExistence(queryId, false) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._queries[queryId] = query;
        s._queryIds.push(queryId);

        // checks for all the requests in this query
        _checkRequestsInQuery(queryId);

        emit QuerySet(queryId, query.requestIds);
    }

    /**
     * @dev Gets a specific multi query by ID
     * @param queryId The ID of the multi query
     * @return query The query data
     */
    function getQuery(uint256 queryId) public view returns (Query memory query) {
        return _getUniversalVerifierMultiQueryStorage()._queries[queryId];
    }

    function _checkRequestsInQuery(uint256 queryId) internal view {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

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
    ) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();
        address sender = _msgSender();

        // 1. Process crossChainProofs
        $._state.processCrossChainProofs(crossChainProofs);

        // 2. Process auth response first
        if (authResponses.length != 1) {
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
            writeAuthProofResults(authResponses[0].authType, userIDFromReponse, authSignals);
            emit AuthResponseSubmitted(authResponses[0].authType, _msgSender());
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
            Response memory response = singleResponses[i];
            RequestData storage request = $._requests[response.requestId];

            IRequestValidator.ResponseField[] memory signals = request.validator.verify(
                response.proof,
                request.params,
                sender,
                $._state
            );

            writeProofResults(response.requestId, userID, signals);

            if (response.metadata.length > 0) {
                revert("Metadata not supported yet");
            }
            // emit for all the responses
            emit ResponseSubmitted(response.requestId, _msgSender());
        }

        // 5. Verify all the grouped responses, write proof results (under the userID key from the auth of the user),
        //      emit events (existing logic)
        _verifyGroupedResponses(groupedResponses, userID, sender);
    }

    function _verifyGroupedResponses(
        GroupedResponses[] memory groupedResponses,
        uint256 userID,
        address sender
    ) internal {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        for (uint256 i = 0; i < groupedResponses.length; i++) {
            for (uint256 j = 0; j < groupedResponses[i].responses.length; j++) {
                Response memory response = groupedResponses[i].responses[j];
                RequestData storage request = $._requests[response.requestId];

                IRequestValidator.ResponseField[] memory signals = request.validator.verify(
                    response.proof,
                    request.params,
                    sender,
                    $._state
                );

                writeProofResults(response.requestId, userID, signals);

                if (response.metadata.length > 0) {
                    revert("Metadata not supported yet");
                }

                emit ResponseSubmitted(response.requestId, _msgSender());
            }
        }
    }

    /**
     * @dev Writes proof results.
     * @param requestId The request ID of the proof
     * @param userID The userID of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeProofResults(
        uint256 requestId,
        uint256 userID,
        IRequestValidator.ResponseField[] memory responseFields
    ) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        Proof[] storage proofs = $._proofs[requestId][userID];
        // We only keep only 1 proof now without history. Prepared for the future if needed.
        if (proofs.length == 0) {
            proofs.push();
        }
        for (uint256 i = 0; i < responseFields.length; i++) {
            proofs[0].storageFields[responseFields[i].name] = responseFields[i].value;
        }

        proofs[0].isVerified = true;
        proofs[0].validatorVersion = $._requests[requestId].validator.version();
        proofs[0].blockTimestamp = block.timestamp;
    }

    /**
     * @dev Writes proof results.
     * @param authType The auth type of the proof
     * @param userID The userID of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeAuthProofResults(
        string memory authType,
        uint256 userID,
        IAuthValidator.ResponseField[] memory responseFields
    ) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        AuthProof[] storage proofs = $._authProofs[authType][userID];
        if (proofs.length == 0) {
            proofs.push();
        }
        for (uint256 i = 0; i < responseFields.length; i++) {
            proofs[0].storageFields[responseFields[i].name] = responseFields[i].value;
        }

        proofs[0].isVerified = true;
        proofs[0].validatorVersion = $._authMethods[authType].validator.version();
        proofs[0].blockTimestamp = block.timestamp;
    }

    /**
     * @dev Sets an auth type
     * @param authType The auth type to add
     */
    function setAuthType(
        AuthType calldata authType
    ) public onlyOwner checkAuthTypeExistence(authType.authType, false) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._authTypes.push(authType.authType);
        s._authMethods[authType.authType] = AuthTypeData({
            validator: authType.validator,
            params: authType.params,
            isActive: true
        });

        emit AuthTypeSet(authType.authType, address(authType.validator), authType.params);
    }

    /**
     * @dev Disables an auth type
     * @param authType The auth type to disable
     */
    function disableAuthType(
        string calldata authType
    ) public onlyOwner checkAuthTypeExistence(authType, true) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._authMethods[authType].isActive = false;
    }

    /**
     * @dev Enables an auth type
     * @param authType The auth type to enable
     */
    function enableAuthType(
        string calldata authType
    ) public onlyOwner checkAuthTypeExistence(authType, true) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
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
        return _getUniversalVerifierMultiQueryStorage()._authMethods[authType];
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
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
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
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
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
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        uint256 userID = s._user_address_to_id[sender];
        return s._authProofs[authType][userID][0].storageFields[responseFieldName];
    }

    function _checkLinkedResponseFields(uint256 queryId, uint256 userID) internal view {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

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
        returns (AuthProofStatus[] memory, RequestProofStatus[] memory)
    {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

        // 1. Get the latest userId by the userAddress arg (in the mapping)
        uint256 userID = s._user_address_to_id[userAddress];
        if (userID == 0) {
            revert UserIDNotFound(userID);
        }

        // 2. Check if all requests statuses are true for the userId
        (
            AuthProofStatus[] memory authProofStatus,
            RequestProofStatus[] memory requestProofStatus
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
        returns (AuthProofStatus[] memory, RequestProofStatus[] memory)
    {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

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
            AuthProofStatus[] memory authProofStatus,
            RequestProofStatus[] memory requestProofStatus
        ) = _getQueryStatus(queryId, userIDSelected);

        // 3. Check if all linked response fields are the same
        _checkLinkedResponseFields(queryId, userIDSelected);

        return (authProofStatus, requestProofStatus);
    }

    function _getQueryStatus(
        uint256 queryId,
        uint256 userID
    ) internal view returns (AuthProofStatus[] memory, RequestProofStatus[] memory) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        Query storage query = s._queries[queryId];

        uint256 lengthGroupIds;

        if (query.groupIds.length > 0) {
            for (uint256 i = 0; i < query.groupIds.length; i++) {
                uint256 groupId = query.groupIds[i];
                lengthGroupIds += s._groupedRequests[groupId].length;
            }
        }

        AuthProofStatus[] memory authProofStatus = new AuthProofStatus[](s._authTypes.length);
        RequestProofStatus[] memory requestProofStatus = new RequestProofStatus[](
            query.requestIds.length + lengthGroupIds
        );

        for (uint256 i = 0; i < s._authTypes.length; i++) {
            string memory authType = s._authTypes[i];
            authProofStatus[i] = AuthProofStatus({
                authType: authType,
                isVerified: s._authProofs[authType][userID][0].isVerified,
                validatorVersion: s._authProofs[authType][userID][0].validatorVersion,
                timestamp: s._authProofs[authType][userID][0].blockTimestamp
            });
        }

        for (uint256 i = 0; i < query.requestIds.length; i++) {
            uint256 requestId = query.requestIds[i];

            requestProofStatus[i] = RequestProofStatus({
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

                requestProofStatus[query.requestIds.length + j] = RequestProofStatus({
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
     * @dev Checks if a user is authenticated
     * @param userID The ID of the user
     * @param userAddress The address of the user
     * @return Whether the user is authenticated
     */
    function isUserAuth(uint256 userID, address userAddress) public view returns (bool) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
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
            UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

            return s._user_auth_timestamp[userID][userAddress];
        } else {
            return 0;
        }
    }

    /**
     * @dev Adds a validator to the whitelist
     * @param validator The validator to add
     */
    function addValidatorToWhitelist(IRequestValidator validator) public {
        if (!IERC165(address(validator)).supportsInterface(type(IRequestValidator).interfaceId)) {
            revert ValidatorNotSupportInterface(address(validator));
        }

        _getUniversalVerifierMultiQueryStorage()._validatorWhitelist[validator] = true;
    }

    /**
     * @dev Removes a validator from the whitelist
     * @param validator The validator to remove
     */
    function removeValidatorFromWhitelist(IRequestValidator validator) public {
        _getUniversalVerifierMultiQueryStorage()._validatorWhitelist[validator] = false;
    }

    /**
     * @dev Checks if a validator is whitelisted
     * @param validator The validator to check
     * @return Whether the validator is whitelisted
     */
    function isWhitelistedValidator(
        IRequestValidator validator
    ) public view virtual returns (bool) {
        return _getUniversalVerifierMultiQueryStorage()._validatorWhitelist[validator];
    }
}
