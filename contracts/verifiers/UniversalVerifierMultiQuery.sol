// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";

contract UniversalVerifierMultiQuery is Ownable2StepUpgradeable {
    /**
     * @dev Version of the contract
     */
    string public constant VERSION = "1.0.0";

    // requestId. 32 bytes (in Big Endian): 31-0x00(not used), 30-0x01(requestType), 29..0 hash calculated Id,
    //
    // For requestType:
    // 0x00 - regular request
    // 0x01 - auth request
    /**
     * @dev Auth request type
     */
    uint8 constant AUTH_REQUEST_TYPE = 1;

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
        uint256 blockNumber;
        uint256 blockTimestamp;
        mapping(string key => bytes) metadata;
    }

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

    struct GroupedResponses {
        uint256 groupId;
        Response[] responses;
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
        mapping(uint256 requestId => mapping(uint256 userID => Proof)) _proofs;
        mapping(uint256 requestId => RequestData) _requests;
        uint256[] _requestIds;
        mapping(uint256 groupId => uint256[] requestIds) _groupedRequests;
        //      1. Set Req 1 (groupID = 1)
        // Check that groupID doesn't exist yet
        //      2. Set Req 2 (groupID = 1)
        // Check that groupID doesn't exist yet
        //      3. Set Req 200 (groupID = 1)
        // Check that groupID doesn't exist yet

        //      4. Set Req 3 (groupID = 2)
        //      5. Set Req 201 (groupID = 2)

        //      6. setQuery[1,2]
        // Check that groupID doesn't exist yet
        //           1 => [1, 2]
        //           2 => [3, 201]

        //        7. submitResponse: requests 1, 2, 200
        //                7.1 Check that all the group are full
        //                7.2 Check LinkID is the same for each of the groups

        //        8. getQueryStatus: it result to FALSE cuz requests 3 and 201 are false
        //        9. submitResponse: requests 3,201
        //        10. getQueryStatus: it result to TRUE as all requests are true

        // Query1 => (1, 2, 200), (3, 201)
        // Query2 => (1, 2, 200), 10

        IState _state;
        // Information about queries
        mapping(uint256 queryId => Query) _queries;
        uint256[] _queryIds;
        // Information linked between users and their addresses
        mapping(address userAddress => uint256 userID) _user_address_to_id;
        mapping(uint256 userID => address userAddress) _id_to_user_address;
        mapping(uint256 userID => mapping(address userAddress => bool hasAuth)) _user_id_and_address_auth;
        uint256[] _authRequestIds; // reuses the same _requests mapping to store the auth requests
        // Whitelisted validators
        mapping(IRequestValidator => bool isApproved) _validatorWhitelist;
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
     * @dev Event emitted upon adding an auth request by the owner
     */
    event AuthRequestSet(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes params
    );

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
            require(requestIdExists(requestId), "request id or auth request id doesn't exist");
        } else {
            require(!requestIdExists(requestId), "request id or auth request id already exists");
        }
        _;
    }

    /**
     * @dev Modifier to check if the request exists
     */
    modifier checkRequestGroupExistence(uint256 groupId, bool existence) {
        if (existence) {
            require(groupIdExists(groupId), "group id doesn't exist");
        } else {
            require(!groupIdExists(groupId), "group id already exists");
        }
        _;
    }

    /**
     * @dev Modifier to check if the query exists
     */
    modifier checkQueryExistence(uint256 queryId, bool existence) {
        if (existence) {
            require(queryIdExists(queryId), "query id doesn't exist");
        } else {
            require(!queryIdExists(queryId), "query id already exists");
        }
        _;
    }

    /**
     * @dev Modifier to check if the validator is whitelisted
     */
    modifier onlyWhitelistedValidator(IRequestValidator validator) {
        require(isWhitelistedValidator(validator), "Validator is not whitelisted");
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

    function _getRequestType(uint256 requestId) internal pure returns (uint8 requestType) {
        return uint8(requestId >> 248);
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
        return _getUniversalVerifierMultiQueryStorage()._groupedRequests[groupId].length > 0;
    }

    /**
     * @dev Checks if a query ID exists
     * @param queryId The ID of the query
     * @return Whether the query ID exists
     */
    function queryIdExists(uint256 queryId) public view returns (bool) {
        return _getUniversalVerifierMultiQueryStorage()._queries[queryId].queryId == queryId;
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
     * @dev Sets a request
     * @param request The request data
     */
    function setRequest(
        Request calldata request
    )
        public
        checkRequestExistence(request.requestId, false)
        checkRequestGroupExistence(request.validator.getGroupID(request.params), false)
        onlyWhitelistedValidator(request.validator)
    {
        _setRequest(request);
    }

    function _setRequest(Request calldata request) internal {
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
            setRequest(singleRequests[i]); // checkRequestGroupExistence is done in setRequest
        }
        for (uint256 i = 0; i < groupedRequests.length; i++) {
            for (uint256 j = 0; j < groupedRequests[i].requests.length; j++) {
                _setRequest(groupedRequests[i].requests[j]); // checkRequestGroupExistence is not done here
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

    function _checkAuthResponses(Response[] memory responses) internal pure returns (uint256) {
        uint256 numAuthResponses = 0;
        uint256 authResponseIndex;

        for (uint256 i = 0; i < responses.length; i++) {
            if (_getRequestType(responses[i].requestId) == AUTH_REQUEST_TYPE) {
                authResponseIndex = i;
                numAuthResponses++;
            }
        }
        require(numAuthResponses == 1, "Exactly 1 auth response is required");

        return authResponseIndex;
    }

    function _checkRequestsInQuery(uint256 queryId) internal view {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

        uint256[] memory requestIds = s._queries[queryId].requestIds;

        // check that all the single requests doesn't have group
        for (uint256 i = 0; i < requestIds.length; i++) {
            require(
                s._requests[requestIds[i]].validator.getGroupID(
                    s._requests[requestIds[i]].params
                ) == 0,
                "A single request in this query is a grouped request"
            );
        }
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param authResponses The list of auth responses including request ID, proof and metadata for auth requests
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(
        Response[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses,
        bytes memory crossChainProofs
    ) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();
        address sender = _msgSender();

        // 1. Process crossChainProofs
        $._state.processCrossChainProofs(crossChainProofs);

        // 2. Process auth responses first

        for (uint256 i = 0; i < authResponses.length; i++) {
            uint256 userIDFromReponse;
            if (_getRequestType(authResponses[i].requestId) != AUTH_REQUEST_TYPE) {
                revert("Request ID is not an auth request");
            }
            RequestData memory authRequest = $._requests[authResponses[i].requestId];
            IRequestValidator.ResponseField[] memory authSignals = authRequest.validator.verify(
                authResponses[i].proof,
                authRequest.params,
                sender,
                $._state
            );

            for (uint256 j = 0; j < authSignals.length; j++) {
                if (keccak256(bytes(authSignals[j].name)) == keccak256(bytes("userID"))) {
                    userIDFromReponse = authSignals[j].value;
                    break;
                }
            }

            writeProofResults(authResponses[i].requestId, userIDFromReponse, authSignals);

            emit ResponseSubmitted(authResponses[i].requestId, _msgSender());

            $._user_address_to_id[sender] = userIDFromReponse;
            $._id_to_user_address[userIDFromReponse] = sender;
            $._user_id_and_address_auth[userIDFromReponse][sender] = true;
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
            RequestData memory request = $._requests[response.requestId];

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
        _writeGroupedResponses(groupedResponses, userID, sender);
    }

    function _writeGroupedResponses(
        GroupedResponses[] memory groupedResponses,
        uint256 userID,
        address sender
    ) internal {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        for (uint256 i = 0; i < groupedResponses.length; i++) {
            for (uint256 j = 0; j < groupedResponses[i].responses.length; j++) {
                Response memory response = groupedResponses[i].responses[j];
                RequestData memory request = $._requests[response.requestId];

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

        Proof storage proof = $._proofs[requestId][userID];
        for (uint256 i = 0; i < responseFields.length; i++) {
            proof.storageFields[responseFields[i].name] = responseFields[i].value;
        }

        proof.isVerified = true;
        proof.validatorVersion = $._requests[requestId].validator.version();
        proof.blockNumber = block.number;
        proof.blockTimestamp = block.timestamp;
    }

    /**
     * @dev Adds an auth request
     * @param request The data of the auth request to add
     */
    function setAuthRequest(
        Request calldata request
    ) public checkRequestExistence(request.requestId, false) onlyOwner {
        if (_getRequestType(request.requestId) != AUTH_REQUEST_TYPE) {
            revert("Request ID is not an auth request");
        }

        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._requests[request.requestId] = RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params
        });
        s._requestIds.push(request.requestId);

        s._authRequestIds.push(request.requestId);

        emit AuthRequestSet(
            request.requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.params
        );
    }

    /**
     * @dev Gets an auth request
     * @param requestId The Id of the auth request to get
     * @return authRequest The auth request data
     */
    function getAuthRequest(
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (RequestData memory authRequest) {
        return _getUniversalVerifierMultiQueryStorage()._requests[requestId];
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
        return s._proofs[requestId][userID].storageFields[responseFieldName];
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
        return s._proofs[requestId][userID].storageFields[responseFieldName];
    }

    function _checkLinkedResponseFields(uint256 queryId, uint256 userID) internal view {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

        for (uint256 i = 0; i < s._queries[queryId].groupIds.length; i++) {
            uint256 groupId = s._queries[queryId].groupIds[i];

            // Check linkID in the same group or requests is the same
            uint256 requestLinkID = getResponseFieldValue(
                s._groupedRequests[groupId][0],
                userID,
                "linkID"
            );
            for (uint256 j = 1; j < s._groupedRequests[groupId].length; j++) {
                uint256 requestLinkIDToCompare = getResponseFieldValue(
                    s._groupedRequests[groupId][j],
                    userID,
                    "linkID"
                );
                require(
                    requestLinkIDToCompare == requestLinkID,
                    "linkID is not the same for each of the requests of the group"
                );
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
    ) public view checkQueryExistence(queryId, true) returns (bool status) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

        // 1. Get the latest userId by the userAddress arg (in the mapping)
        uint256 userID = s._user_address_to_id[userAddress];
        require(userID != 0, "UserID not found");

        // 2. Check if any active auth for the userId is true
        bool activeAuth = s._user_id_and_address_auth[userID][userAddress];
        require(activeAuth, "No active auth for the user found");

        // 3. Check if all requests statuses are true for the userId
        for (uint256 i = 0; i < s._queries[queryId].requestIds.length; i++) {
            uint256 requestId = s._queries[queryId].requestIds[i];
            if (!s._proofs[requestId][userID].isVerified) {
                return false;
            }
        }
        // 4. Check if all linked response fields are the same
        _checkLinkedResponseFields(queryId, userID);

        return true;
    }

    /**
     * @dev Adds a validator to the whitelist
     * @param validator The validator to add
     */
    function addValidatorToWhitelist(IRequestValidator validator) public {
        require(
            IERC165(address(validator)).supportsInterface(type(IRequestValidator).interfaceId),
            "Validator doesn't support relevant interface"
        );

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
