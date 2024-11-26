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
     * @dev ResponseFieldFromRequest. Structure for response field from request to be linked.
     * @param requestId Request id.
     * @param responseFieldName Response field name.
     */
    struct ResponseFieldFromRequest {
        uint256 requestId;
        string responseFieldName;
    }

    /**
     * @dev MultiQuery. Structure for request.
     * @param multiQueryId Multi query id.
     * @param requestIds Request ids for this multi query.
     * @param linkedOutputParamsNames Output params to link from every request proof.
     */
    struct MultiQuery {
        uint256 multiQueryId;
        uint256[] requestIds;
        ResponseFieldFromRequest[][] linkedResponseFields; // is response fields linked between requests
    }
    // Example of linkedResponseFields:
    //  [
    //      [{linkID, 1}, {linkID, 2}, {linkID, 3}]
    //      [{userID, 1}, {userID, 2}, {userID, 3}],
    //  ]

    /// @custom:storage-location erc7201:iden3.storage.UniversalVerifierMultiQuery
    struct UniversalVerifierMultiQueryStorage {
        // Information about requests
        mapping(uint256 userID => mapping(uint256 requestId => Proof)) _proofs;
        mapping(uint256 requestId => Request) _requests;
        uint256[] _requestIds;
        IState _state;
        // Information about multi-queries
        mapping(uint256 multiQueryId => MultiQuery) _multiQueries;
        uint256[] _multiQueryIds;
        // Information linked between users and their addresses
        mapping(address userAddress => uint256 userID) _user_address_to_id;
        mapping(uint256 userID => address userAddress) _id_to_user_address; // check address[] to allow multiple addresses for the same userID?
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
     * @dev Event emitted upon adding a multi query
     */
    event MultiQuerySet(uint256 indexed multiQueryId, uint256[] requestIds);

    /**
     * @dev Event emitted upon updating a multi query
     */
    event MultiQueryUpdate(uint256 indexed multiQueryId, uint256[] requestIds);

    /**
     * @dev Modifier to check if the validator is set for the request
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
     * @dev Sets a multi query
     * @param multiQueryId The ID of the multi query
     * @param linkedResponseFields The params for linking response fields between requests
     */
    function setMultiQuery(
        uint256 multiQueryId,
        ResponseFieldFromRequest[][] memory linkedResponseFields
    ) public {
        //TODO;
    }

    /**
     * @dev Gets a specific multi query by ID
     * @param multiQueryId The ID of the multi query
     * @return multiQuery The multi query data
     */
    function getMultiQuery(uint256 multiQueryId) public view returns (MultiQuery memory) {
        //TODO;
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param responses The list of responses including request ID, proof and metadata
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(Response[] memory responses, bytes memory crossChainProofs) public {
        UniversalVerifierMultiQueryStorage storage $ = _getUniversalVerifierMultiQueryStorage();

        $._state.processCrossChainProofs(crossChainProofs);

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
}
