// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {VerifierLib} from "../lib/VerifierLib.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

error AuthMethodNotFound(string authMethod);
error AuthMethodAlreadyExists(string authMethod);
error AuthMethodIsNotActive(string authMethod);
error GroupIdNotFound(uint256 groupId);
error GroupIdAlreadyExists(uint256 groupId);
error GroupMustHaveAtLeastTwoRequests(uint256 groupId);
error LinkIDNotTheSameForGroupedRequests();
error MetadataNotSupportedYet();
error MultiRequestIdAlreadyExists(uint256 multiRequestId);
error MultiRequestIdNotFound(uint256 multiRequestId);
error MultiRequestIdNotValid(uint256 expectedMultiRequestId, uint256 multiRequestId);
error NullifierSessionIDAlreadyExists(uint256 nullifierSessionID);
error ResponseFieldDoesNotExist(uint256 requestId, address sender, string responseFieldName);
error ResponseFieldAlreadyExists(uint256 requestId, address sender, string responseFieldName);
error ProofAlreadyVerified(uint256 requestId, address sender);
error ProofIsNotVerified(uint256 requestId, address sender);
error RequestIdAlreadyExists(uint256 requestId);
error RequestIdNotFound(uint256 requestId);
error RequestIdNotValid(uint256 expectedRequestId, uint256 requestId);
error RequestIdUsesReservedBytes();
error RequestIdTypeNotValid();
error RequestShouldNotHaveAGroup(uint256 requestId);
error UserIDMismatch(uint256 userIDFromAuth, uint256 userIDFromResponse);
error MissingUserIDInRequest(uint256 requestId);
error MissingUserIDInGroupOfRequests(uint256 groupId);
error UserNotAuthenticated();
error VerifierIDIsNotValid(uint256 requestVerifierID, uint256 expectedVerifierID);
error ChallengeIsInvalid();
error InvalidRequestOwner(address requestOwner, address sender);
error GroupIdNotValid();

abstract contract Verifier is IVerifier, ContextUpgradeable {
    // keccak256(abi.encodePacked("authV2"))
    bytes32 private constant AUTHV2_METHOD_NAME_HASH =
        0x380ee2d21c7a4607d113dad9e76a0bc90f5325a136d5f0e14b6ccf849d948e25;
    // keccak256(abi.encodePacked("challenge"))
    bytes32 private constant CHALLENGE_FIELD_NAME_HASH =
        0x62357b294ca756256b576c5da68950c49d0d1823063551ffdcc1dad9d65a07a6;

    struct AuthMethodData {
        IAuthValidator validator;
        bytes params;
        bool isActive;
    }

    struct GroupInfo {
        uint256 id;
        bytes concatenatedRequestIds;
        bool userIdInputExists;
    }

    /// @custom:storage-location erc7201:iden3.storage.Verifier
    struct VerifierStorage {
        // Information about requests
        // solhint-disable-next-line
        mapping(uint256 requestId => mapping(address sender => Proof)) _proofs;
        mapping(uint256 requestId => IVerifier.RequestData) _requests;
        uint256[] _requestIds;
        IState _state;
        mapping(uint256 groupId => uint256[] requestIds) _groupedRequests;
        uint256[] _groupIds;
        // Information about multiRequests
        mapping(uint256 multiRequestId => IVerifier.MultiRequest) _multiRequests;
        uint256[] _multiRequestIds;
        // Information about auth methods and validators
        string[] _authMethodsNames;
        mapping(string authMethod => AuthMethodData) _authMethods;
        mapping(uint256 nullifierSessionID => uint256 requestId) _nullifierSessionIDs;
        // verifierID to check in requests
        uint256 _verifierID;
    }

    /**
     * @dev Struct to store proof and associated data
     */
    struct Proof {
        bool isVerified;
        ProofEntry[] proofEntries;
    }

    struct ProofEntry {
        mapping(string key => uint256 inputValue) responseFields;
        string[] responseFieldNames;
        // introduce artificial shift + 1 to avoid 0 index
        mapping(string key => uint256 keyIndex) responseFieldIndexes;
        string validatorVersion;
        uint256 blockTimestamp;
        uint256[45] __gap;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.Verifier")) -1 )) & ~bytes32(uint256(0xff));
    // solhint-disable-next-line const-name-snakecase
    bytes32 internal constant VerifierStorageLocation =
        0x11369addde4aae8af30dcf56fa25ad3d864848d3201d1e9197f8b4da18a51a00;

    function _getVerifierStorage() private pure returns (VerifierStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := VerifierStorageLocation
        }
    }

    bytes2 internal constant VERIFIER_ID_TYPE = 0x01A1;

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
                revert RequestIdAlreadyExists(requestId);
            }
        }
        _;
    }

    /**
     * @dev Modifier to check if the auth type exists
     */
    modifier checkAuthMethodExistence(string memory authMethod, bool existence) {
        if (existence) {
            if (!authMethodExists(authMethod)) {
                revert AuthMethodNotFound(authMethod);
            }
        } else {
            if (authMethodExists(authMethod)) {
                revert AuthMethodAlreadyExists(authMethod);
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
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return Whether the request ID exists
     */
    function requestIdExists(uint256 requestId) public view returns (bool) {
        return VerifierLib.requestIdExists(_getVerifierStorage(), requestId);
    }

    /**
     * @dev Checks if a group ID exists
     * @param groupId The ID of the group
     * @return Whether the group ID exists
     */
    function groupIdExists(uint256 groupId) public view returns (bool) {
        return VerifierLib.groupIdExists(_getVerifierStorage(), groupId);
    }

    /**
     * @dev Checks if a multiRequest ID exists
     * @param multiRequestId The ID of the multiRequest
     * @return Whether the multiRequest ID exists
     */
    function multiRequestIdExists(uint256 multiRequestId) public view returns (bool) {
        return VerifierLib.multiRequestIdExists(_getVerifierStorage(), multiRequestId);
    }

    /**
     * @dev Checks if an auth method exists
     * @param authMethod The auth method
     * @return Whether the auth type exists
     */
    function authMethodExists(string memory authMethod) public view returns (bool) {
        return VerifierLib.authMethodExists(_getVerifierStorage(), authMethod);
    }

    /**
     * @dev Sets different requests
     * @param requests The list of requests
     */
    function setRequests(IVerifier.Request[] calldata requests) public {
        VerifierStorage storage $ = _getVerifierStorage();
        // 1. Check first that groupIds don't exist and keep the number of requests per group.
        VerifierLib.checkGroupIdsAndRequestsPerGroup($, requests);

        // 2. Set requests checking groups and nullifierSessionID uniqueness
        for (uint256 i = 0; i < requests.length; i++) {
            VerifierLib.checkRequestIdCorrectness(
                requests[i].requestId,
                requests[i].params,
                requests[i].creator
            );

            VerifierLib.checkNullifierSessionIdUniqueness($, requests[i]);
            VerifierLib.checkVerifierID($, requests[i]);

            _setRequest(requests[i]);
        }
    }

    /**
     * @dev Gets a specific request by ID
     * @param requestId The ID of the request
     * @return request The request info
     */
    function getRequest(uint256 requestId) public view returns (RequestInfo memory request) {
        return VerifierLib.getRequest(_getVerifierStorage(), requestId);
    }

    /**
     * @dev Sets a multiRequest
     * @param multiRequest The multiRequest data
     */
    function setMultiRequest(IVerifier.MultiRequest calldata multiRequest) public virtual {
        VerifierLib.setMultiRequest(_getVerifierStorage(), multiRequest, _msgSender());
    }

    /**
     * @dev Gets a specific multiRequest by ID
     * @param multiRequestId The ID of the multiRequest
     * @return multiRequest The multiRequest data
     */
    function getMultiRequest(
        uint256 multiRequestId
    ) public view returns (IVerifier.MultiRequest memory multiRequest) {
        return VerifierLib.getMultiRequest(_getVerifierStorage(), multiRequestId);
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

        /*uint256 userIDFromAuthResponse;
        AuthMethodData storage authMethodData = $._authMethods[authResponse.authMethod];
        if (!authMethodData.isActive) {
            revert AuthMethodIsNotActive(authResponse.authMethod);
        }

        // 2. Authenticate user and get userID
        IAuthValidator.AuthResponseField[] memory authResponseFields;
        (userIDFromAuthResponse, authResponseFields) = authMethodData.validator.verify(
            sender,
            authResponse.proof,
            authMethodData.params
        );

        if (keccak256(abi.encodePacked(authResponse.authMethod)) == AUTHV2_METHOD_NAME_HASH) {
            if (
                authResponseFields.length > 0 &&
                keccak256(abi.encodePacked(authResponseFields[0].name)) == CHALLENGE_FIELD_NAME_HASH
            ) {
                bytes32 expectedNonce = keccak256(abi.encode(sender, responses)) &
                    0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
                if (expectedNonce != bytes32(authResponseFields[0].value)) {
                    revert ChallengeIsInvalid();
                }
            }
        }

        if (userIDFromAuthResponse == 0) {
            revert UserNotAuthenticated();
        }*/

        // 3. Verify all the responses, check userID from signals and write proof results,
        //      emit events (existing logic)
        for (uint256 i = 0; i < responses.length; i++) {
            IVerifier.Response memory response = responses[i];
            IVerifier.RequestData storage request = _getRequestIfCanBeVerified(response.requestId);

            IRequestValidator.ResponseField[] memory signals = request.validator.verify(
                sender,
                response.proof,
                request.params,
                response.metadata
            );

            // Check if userID from authResponse is the same as the one in the signals
            // VerifierLib.checkUserIDMatch(userIDFromAuthResponse, signals);

            _writeProofResults(response.requestId, sender, signals);

            if (response.metadata.length > 0) {
                revert MetadataNotSupportedYet();
            }
        }
    }

    /**
     * @dev Sets an auth method
     * @param authMethod The auth method to add
     */
    function setAuthMethod(IVerifier.AuthMethod calldata authMethod) public virtual {
        VerifierLib.setAuthMethod(_getVerifierStorage(), authMethod);
    }

    /**
     * @dev Disables an auth method
     * @param authMethod The auth method to disable
     */
    function disableAuthMethod(string calldata authMethod) public virtual {
        VerifierLib.disableAuthMethod(_getVerifierStorage(), authMethod);
    }

    /**
     * @dev Enables an auth type
     * @param authMethod The auth type to enable
     */
    function enableAuthMethod(string calldata authMethod) public virtual {
        VerifierLib.enableAuthMethod(_getVerifierStorage(), authMethod);
    }

    /**
     * @dev Gets an auth type
     * @param authMethod The Id of the auth type to get
     * @return authMethodData The auth type data
     */
    function getAuthMethod(
        string calldata authMethod
    ) public view returns (AuthMethodData memory authMethodData) {
        return VerifierLib.getAuthMethod(_getVerifierStorage(), authMethod);
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
    ) public view returns (uint256) {
        return
            VerifierLib.getResponseFieldValue(
                _getVerifierStorage(),
                requestId,
                sender,
                responseFieldName
            );
    }

    /**
     * @dev Gets proof storage response fields
     * @param requestId Id of the request
     * @param sender Address of the user
     */
    function getResponseFields(
        uint256 requestId,
        address sender
    ) public view returns (IRequestValidator.ResponseField[] memory) {
        return VerifierLib.getResponseFields(_getVerifierStorage(), requestId, sender);
    }

    /**
     * @dev Gets the status of the multiRequest verification
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function getMultiRequestProofsStatus(
        uint256 multiRequestId,
        address userAddress
    ) public view returns (IVerifier.RequestProofStatus[] memory) {
        return
            VerifierLib.getMultiRequestProofsStatus(
                _getVerifierStorage(),
                multiRequestId,
                userAddress
            );
    }

    /**
     * @dev Checks if the proofs from a Multirequest submitted for a given sender and request ID are verified
     * @param multiRequestId The ID of the multiRequest
     * @param userAddress The address of the user
     * @return status The status of the multiRequest. "True" if all requests are verified, "false" otherwise
     */
    function areMultiRequestProofsVerified(
        uint256 multiRequestId,
        address userAddress
    ) public view returns (bool) {
        return
            VerifierLib.areMultiRequestProofsVerified(
                _getVerifierStorage(),
                multiRequestId,
                userAddress
            );
    }

    /**
     * @dev Checks if a proof from a request submitted for a given sender and request ID is verified
     * @param sender The sender's address
     * @param requestId The ID of the request
     * @return True if proof is verified
     */
    function isRequestProofVerified(
        address sender,
        uint256 requestId
    ) public view checkRequestExistence(requestId, true) returns (bool) {
        return _getVerifierStorage()._proofs[requestId][sender].isVerified;
    }

    /**
     * @dev Get the requests count.
     * @return Requests count.
     */
    function getRequestsCount() public view returns (uint256) {
        return _getVerifierStorage()._requestIds.length;
    }

    /**
     * @dev Get the group of requests count.
     * @return Group of requests count.
     */
    function getGroupsCount() public view returns (uint256) {
        return _getVerifierStorage()._groupIds.length;
    }

    /**
     * @dev Get the group of requests.
     * @return Group of requests.
     */
    function getGroupedRequests(
        uint256 groupID
    ) public view returns (IVerifier.RequestInfo[] memory) {
        return VerifierLib.getGroupedRequests(_getVerifierStorage(), groupID);
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
    function getRequestProofStatus(
        address sender,
        uint256 requestId
    )
        public
        view
        checkRequestExistence(requestId, true)
        returns (IVerifier.RequestProofStatus memory)
    {
        return VerifierLib.getRequestProofStatus(_getVerifierStorage(), sender, requestId);
    }

    function _setState(IState state) internal {
        _getVerifierStorage()._state = state;
    }

    // solhint-disable-next-line func-name-mixedcase
    function __Verifier_init(IState state) internal onlyInitializing {
        __Verifier_init_unchained(state);
    }

    // solhint-disable-next-line func-name-mixedcase
    function __Verifier_init_unchained(IState state) internal onlyInitializing {
        _setState(state);
        // initial calculation of verifierID from contract address and verifier id type defined
        uint256 calculatedVerifierID = GenesisUtils.calcIdFromEthAddress(
            VERIFIER_ID_TYPE,
            address(this)
        );
        _setVerifierID(calculatedVerifierID);
    }

    function _setVerifierID(uint256 verifierID) internal {
        VerifierStorage storage s = _getVerifierStorage();
        s._verifierID = verifierID;
    }

    function _setRequest(
        Request calldata request
    ) internal virtual checkRequestExistence(request.requestId, false) {
        _checkRequestOwner(request);

        VerifierStorage storage s = _getVerifierStorage();

        s._requests[request.requestId] = IVerifier.RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params,
            creator: _msgSender()
        });
        s._requestIds.push(request.requestId);
    }

    function _checkRequestOwner(Request calldata request) internal virtual {
        if (request.creator != _msgSender()) {
            revert InvalidRequestOwner(request.creator, _msgSender());
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

        s._requests[request.requestId] = IVerifier.RequestData({
            metadata: request.metadata,
            validator: request.validator,
            params: request.params,
            creator: _msgSender()
        });
    }

    function _checkCanWriteProofResults(uint256 requestId, address sender) internal view virtual {
        VerifierLib.checkCanWriteProofResults(_getVerifierStorage(), requestId, sender);
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
        return _getVerifierStorage()._requests[requestId];
    }

    /**
     * @dev Writes proof results.
     * @param requestId The request ID of the proof
     * @param sender The address of the sender of the proof
     * @param responseFields The array of response fields of the proof
     */
    function _writeProofResults(
        uint256 requestId,
        address sender,
        IRequestValidator.ResponseField[] memory responseFields
    ) internal {
        _checkCanWriteProofResults(requestId, sender);

        return
            VerifierLib.writeProofResults(_getVerifierStorage(), requestId, sender, responseFields);
    }
}
