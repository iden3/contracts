// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

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
     * @dev Request. Structure for request.
     * @param metadata Metadata of the request.
     * @param validator Validator circuit.
     * @param params Params of the request. Proof parameters could be ZK groth16, plonk, ESDSA, EIP712, etc.
     */
    struct Request {
        string metadata;
        IRequestValidator validator;
        bytes params;
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
        uint256 queryId;
        uint256 requestId;
        uint256 requestIndexInQuery;
        bytes proof;
        bytes metadata;
    }

    // TODO discussion result start
    //    struct ResponseFieldFromRequest {
    //        uint256 requestId;
    //        string responseFieldName;
    //        uint256 requestIndexInQuery;
    //    }
    //
    //ResponseFieldFromRequest[][]

    //          [
    //              [{linkID, 1, 0}, {linkID, 2, 0}]
    //              [{linkID, 2, 2}, {linkID, 3, 1}],
    //              [{issuerID, 2, 3}, {issuer, 3, 4}],
    //          ]
    // TODO discussion result start

    struct ResponseFieldFromRequest {
        uint256 requestId;
        uint256 requestIndexInQuery;
        string responseFieldName;
    }

    /**
     * @dev Query. Structure for query.
     * @param queryId Query id.
     * @param requestIds Request ids for this multi query.
     * @param metadata Metadata for the query. Empty in first version.
     */
    struct Query {
        uint256 queryId;
        uint256[] requestIds;
        ResponseFieldFromRequest[][] linkedResponseFields; // this are response fields linked between requests
        bytes metadata;
    }

    /// @custom:storage-location erc7201:iden3.storage.UniversalVerifierMultiQuery
    struct UniversalVerifierMultiQueryStorage {
        // Information about requests
        mapping(uint256 queryId => mapping(uint256 requestIndexInQuery => mapping(uint256 requestId => mapping(uint256 userID => Proof)))) _proofs;
        mapping(uint256 requestId => Request) _requests;
        uint256[] _requestIds;
        IState _state;
        // Information about queries
        mapping(uint256 queryId => Query) _queries;
        uint256[] _queryIds;
        // Information linked between users and their addresses
        mapping(address userAddress => uint256 userID) _user_address_to_id;
        mapping(uint256 userID => address userAddress) _id_to_user_address; // check address[] to allow multiple addresses for the same userID?
        mapping(uint256 userID => mapping(address userAddress => bool hasAuth)) _user_id_and_address_auth;
        uint256[] _authRequestIds; // reuses the same _requests mapping to store the auth requests
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.UniversalVerifierMultiQuery")) - 1)) & ~bytes32(uint256(0xff));
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
            require(requestIdExists(requestId), "request id doesn't exist");
        } else {
            require(!requestIdExists(requestId), "request id already exists");
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
     * @dev Modifier to check if the auth request exists
     */
    modifier checkAuthRequestExistence(uint256 requestId, bool existence) {
        if (existence) {
            require(
                requestIdExists(requestId) && _getRequestType(requestId) == AUTH_REQUEST_TYPE,
                "auth request id doesn't exist"
            );
        } else {
            require(
                !(requestIdExists(requestId) && _getRequestType(requestId) == AUTH_REQUEST_TYPE),
                "auth request id already exists"
            );
        }
        _;
    }

    /**
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return requestType Type of the request
     */
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
     * @dev Checks if a query ID exists
     * @param queryId The ID of the query
     * @return Whether the query ID exists
     */
    function queryIdExists(uint256 queryId) public view returns (bool) {
        return _getUniversalVerifierMultiQueryStorage()._queries[queryId].requestIds.length > 0;
    }

    /**
     * @dev Get the main storage using assembly to ensure specific storage location
     */
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
     * @param requestId The ID of the request
     * @param request The request data
     */
    function setRequest(
        uint256 requestId,
        Request calldata request
    ) public checkRequestExistence(requestId, false) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);

        emit RequestSet(
            requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.params
        );
    }

    /**
     * @dev Gets a specific request by ID
     * @param requestId The ID of the request
     * @return request The request data
     */
    function getRequest(
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (Request memory request) {
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

    /**
     * @dev Checks for exactly 1 auth response and returns the index of the auth response
     * @param responses The list of responses
     * @return The index of the auth response
     */
    function checkAuthResponses(Response[] memory responses) internal pure returns (uint256) {
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

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param responses The list of responses including request ID, proof and metadata
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(Response[] memory responses, bytes memory crossChainProofs) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();
        address sender = _msgSender();

        // 1. Check for auth responses (throw if not provided exactly 1)
        // and return auth response index in the responses array
        // in order to get "userID" from the output response field then
        uint256 authResponseIndex = checkAuthResponses(responses);

        // 2. Process crossChainProofs
        $._state.processCrossChainProofs(crossChainProofs);

        // Verify for the auth request and get the userID
        Response memory authResponse = responses[authResponseIndex];
        Request memory authRequest = getRequest(authResponse.requestId);
        IRequestValidator.ResponseField[] memory authSignals = authRequest.validator.verify(
            authResponse.proof,
            authRequest.params,
            sender,
            $._state
        );

        uint256 userIDFromAuth;
        for (uint256 i = 0; i < authSignals.length; i++) {
            if (keccak256(bytes(authSignals[i].name)) == keccak256(bytes("userID"))) {
                userIDFromAuth = authSignals[i].value;
                break;
            }
        }

        writeProofResults(
            authResponse.queryId,
            authResponse.requestId,
            authResponse.requestIndexInQuery,
            userIDFromAuth,
            authSignals
        );

        $._user_address_to_id[sender] = userIDFromAuth;
        $._id_to_user_address[userIDFromAuth] = sender;
        $._user_id_and_address_auth[userIDFromAuth][sender] = true;

        // 3. Verify regular responses, write proof results (under the userID key from the step 1),
        //      emit events (existing logic)
        for (uint256 i = 0; i < responses.length; i++) {
            // emit for all the responses
            emit ResponseSubmitted(responses[i].requestId, _msgSender());

            // avoid to process auth request again
            if (_getRequestType(responses[i].requestId) == AUTH_REQUEST_TYPE) {
                continue;
            }

            Response memory response = responses[i];

            Request memory request = getRequest(response.requestId);

            IRequestValidator.ResponseField[] memory signals = request.validator.verify(
                response.proof,
                request.params,
                sender,
                $._state
            );

            writeProofResults(
                response.queryId,
                response.requestId,
                response.requestIndexInQuery,
                userIDFromAuth,
                signals
            );

            if (response.metadata.length > 0) {
                revert("Metadata not supported yet");
            }
        }
    }

    /**
     * @dev Writes proof results.
     * @param queryId The query ID of the proof
     * @param requestId The request ID of the proof
     * @param requestIndexInQuery The index of the request in the query definition
     * @param userID The userID of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeProofResults(
        uint256 queryId,
        uint256 requestId,
        uint256 requestIndexInQuery,
        uint256 userID,
        IRequestValidator.ResponseField[] memory responseFields
    ) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        Proof storage proof = $._proofs[queryId][requestId][requestIndexInQuery][userID];
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
     * @param requestId The Id of the auth request to add
     */
    function setAuthRequest(
        uint256 requestId,
        Request calldata request
    ) public checkAuthRequestExistence(requestId, false) onlyOwner {
        if (_getRequestType(requestId) != AUTH_REQUEST_TYPE) {
            revert("Request ID is not an auth request");
        }

        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);

        s._authRequestIds.push(requestId);

        emit AuthRequestSet(
            requestId,
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
    ) public view checkAuthRequestExistence(requestId, true) returns (Request memory authRequest) {
        return _getUniversalVerifierMultiQueryStorage()._requests[requestId];
    }

    /**
     * @dev Gets response field value
     * @param queryId Id of the query
     * @param requestId Id of the request
     * @param requestIndexInQuery Index of the request in the query
     * @param userID Id of the user
     * @param responseFieldName Name of the response field to get
     */
    function getResponseFieldValue(
        uint256 queryId,
        uint256 requestId,
        uint256 requestIndexInQuery,
        uint256 userID,
        string memory responseFieldName
    ) public view returns (uint256) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        return
            s._proofs[queryId][requestId][requestIndexInQuery][userID].storageFields[
                responseFieldName
            ];
    }

    /**
     * @dev Checks if all linked response fields are the same
     * @param queryId The ID of the query
     * @param userID The ID of the user
     * @return Whether all linked response fields are the same
     */
    function checkLinkedResponseFields(uint256 queryId, uint256 userID) public view returns (bool) {
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();

        for (uint256 i = 0; i < s._queries[queryId].linkedResponseFields.length; i++) {
            // check if we have linked response fields
            if (s._queries[queryId].linkedResponseFields[i].length > 0) {
                // Get first value and check if all the values for the same linked responses are the same
                uint256 firstValue = getResponseFieldValue(
                    queryId,
                    s._queries[queryId].linkedResponseFields[i][0].requestId,
                    s._queries[queryId].linkedResponseFields[i][0].requestIndexInQuery,
                    userID,
                    s._queries[queryId].linkedResponseFields[i][0].responseFieldName
                );

                for (uint256 j = 1; j < s._queries[queryId].linkedResponseFields[i].length; j++) {
                    uint256 valueToCompare = getResponseFieldValue(
                        queryId,
                        s._queries[queryId].linkedResponseFields[i][j].requestId,
                        s._queries[queryId].linkedResponseFields[i][j].requestIndexInQuery,
                        userID,
                        s._queries[queryId].linkedResponseFields[i][j].responseFieldName
                    );

                    if (firstValue != valueToCompare) {
                        return false;
                    }
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
    ) public view returns (bool status) {
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
            if (!s._proofs[queryId][requestId][i][userID].isVerified) {
                return false;
            }
        }

        // 4. Check if all linked response fields are the same
        checkLinkedResponseFields(queryId, userID);

        return true;
    }
}
