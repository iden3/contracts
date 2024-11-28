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

    /**
     * @dev Auth request type
     */
    uint256 constant AUTH_REQUEST_TYPE = 1;

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
        uint256 requestId;
        bytes proof;
        bytes metadata;
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
        bytes metadata;
    }

    /// @custom:storage-location erc7201:iden3.storage.UniversalVerifierMultiQuery
    struct UniversalVerifierMultiQueryStorage {
        // Information about requests
        mapping(uint256 requestId => mapping(uint256 userID => Proof)) _proofs;
        mapping(uint256 requestId => Request) _requests;
        uint256[] _requestIds;
        IState _state;
        // Information about queries
        mapping(uint256 queryId => Query) _queries;
        uint256[] _queryIds;
        // Information linked between users and their addresses
        // TODO think about arrays for these two mappings
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
    modifier checkAuthRequestExistence(uint256 authRequestId, bool existence) {
        if (existence) {
            require(
                requestIdExists(authRequestId) && typeOfRequest(authRequestId) == AUTH_REQUEST_TYPE,
                "auth request id doesn't exist"
            );
        } else {
            require(
                !(requestIdExists(authRequestId) &&
                    typeOfRequest(authRequestId) == AUTH_REQUEST_TYPE),
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
    function typeOfRequest(uint256 requestId) public pure returns (uint256 requestType) {
        //TODO: analyze first byte of the request and return its type
        uint256 typeOfTheRequest = 0;
        return typeOfTheRequest = 0;
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

    function checkAuthResponses(Response[] memory responses) internal pure returns (uint256) {
        uint256 numAuthResponses = 0;
        uint256 userID;

        for (uint256 i = 0; i < responses.length; i++) {
            if (typeOfRequest(responses[i].requestId) == AUTH_REQUEST_TYPE) {
                numAuthResponses++;
            }

            //TODO: Get the userID from the response
        }
        require(numAuthResponses == 1, "Exactly 1 auth response is required");

        return userID;
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param responses The list of responses including request ID, proof and metadata
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(Response[] memory responses, bytes memory crossChainProofs) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        // 1. Check for auth responses (throw if not provided exactly 1)
        //      and remember the userID from the response
        uint256 userIDFromResponses = checkAuthResponses(responses);

        // 2. Process crossChainProofs
        $._state.processCrossChainProofs(crossChainProofs);

       // 3. Verify regular responses, write proof results (under the userID key from the step 1),
        //      emit events (existing logic)
        for (uint256 i = 0; i < responses.length; i++) {
            Response memory response = responses[i];

            address sender = _msgSender();

            // TODO some internal method and storage location to save gas?
            Request memory request = getRequest(response.requestId);

            IRequestValidator.ResponseField[] memory signals = request.validator.verify(
                response.proof,
                request.params,
                sender,
                $._state
            );

            //TODO: Find the userID of the sender? or the userID is in the request?
            uint256 userID = $._user_address_to_id[sender];
            require(userID == userIDFromResponses, "User ID mismatch");

            writeProofResults(userID, response.requestId, signals);

            if (response.metadata.length > 0) {
                revert("Metadata not supported yet");
            }
        }

        for (uint256 i = 0; i < responses.length; i++) {
            emit ResponseSubmitted(responses[i].requestId, _msgSender());
        }
    }

    /**
     * @dev Writes proof results.
     * @param userID The userID of the proof
     * @param requestId The request ID of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeProofResults(
        uint256 userID,
        uint256 requestId,
        IRequestValidator.ResponseField[] memory responseFields
    ) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        Proof storage proof = $._proofs[userID][requestId];
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
        UniversalVerifierMultiQueryStorage storage s = _getUniversalVerifierMultiQueryStorage();
        //TODO: Calculate the requestId for auth request
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
     * @param authRequestId The Id of the auth request to get
     * @return authRequest The auth request data
     */
    function getAuthRequest(
        uint256 authRequestId
    )
        public
        view
        checkAuthRequestExistence(authRequestId, true)
        returns (Request memory authRequest)
    {
        return _getUniversalVerifierMultiQueryStorage()._requests[authRequestId];
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
        //TODO implement
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
            if (!s._proofs[userID][requestId].isVerified) {
                return false;
            }
        }

        return true;
    }
}
