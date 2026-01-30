// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.27;

import {IAuthValidator} from "./IAuthValidator.sol";
import {IRequestValidator} from "./IRequestValidator.sol";

/**
 * @dev IVerifier. Interface for creating requests and verifying request responses through validators circuits.
 */
interface IVerifier {
    /**
     * @dev Request. Structure for setting request.
     * @param requestId Request id.
     * @param metadata Metadata of the request.
     * @param validator Validator to verify the response.
     * @param params Parameters data of the request.
     * @param creator Creator of the request.
     */
    struct Request {
        uint256 requestId;
        string metadata;
        IRequestValidator validator;
        bytes params;
        address creator;
    }

    /**
     * @dev Request. Structure for request for storage.
     * @param metadata Metadata of the request.
     * @param validator Validator circuit.
     * @param params Params of the request. Proof parameters could be ZK groth16, plonk, ESDSA, EIP712, etc.
     * @param creator Creator of the request.
     */
    struct RequestData {
        string metadata;
        IRequestValidator validator;
        bytes params;
        address creator;
    }

    /**
     * @dev RequestInfo. Structure for getting request info.
     * @param requestId Request id.
     * @param metadata Metadata of the request.
     * @param validator Validator to verify the response.
     * @param params Parameters data of the request.
     * @param creator Creator of the request.
     */
    struct RequestInfo {
        uint256 requestId;
        string metadata;
        IRequestValidator validator;
        bytes params;
        address creator;
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
     * @dev AuthResponse. Structure for auth response.
     * @param authMethod Auth type of the proof response.
     * @param proof proof to verify.
     * @param metadata Metadata of the auth proof.
     */
    struct AuthResponse {
        string authMethod;
        bytes proof;
        bytes metadata;
    }

    /**
     * @dev RequestProofStatus. Structure for request proof status.
     * @param requestId Request id of the proof.
     * @param isVerified True if the proof is verified.
     * @param validatorVersion Version of the validator.
     * @param timestamp Timestamp of the proof.
     */
    struct RequestProofStatus {
        uint256 requestId;
        bool isVerified;
        string validatorVersion;
        uint256 timestamp;
    }

    /**
     * @dev AuthMethod. Structure for auth type for auth proofs.
     * @param authMethod Auth type of the auth proof.
     * @param validator Validator to verify the auth.
     * @param params Parameters data of the auth.
     */
    struct AuthMethod {
        string authMethod;
        IAuthValidator validator;
        bytes params;
    }

    /**
     * @dev MultiRequest. Structure for multiRequest.
     * @param multiRequestId MultiRequest id.
     * @param requestIds Request ids for this multi multiRequest (without groupId. Single requests).
     * @param groupIds Group ids for this multi multiRequest (all the requests included in the group. Grouped requests).
     * @param metadata Metadata for the multiRequest. Empty in first version.
     */
    struct MultiRequest {
        uint256 multiRequestId;
        uint256[] requestIds;
        uint256[] groupIds;
        bytes metadata;
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
    ) external;

    /**
     * @dev Sets different requests
     * @param requests List of requests
     */
    function setRequests(Request[] calldata requests) external;

    /**
     * @dev Gets a specific request by ID
     * @param requestId The ID of the request
     * @return request The request info
     */
    function getRequest(uint256 requestId) external view returns (RequestInfo memory request);

    /**
     * @dev Get the requests count.
     * @return Requests count.
     */
    function getRequestsCount() external view returns (uint256);

    /**
     * @dev Get the group of requests count.
     * @return Group of requests count.
     */
    function getGroupsCount() external view returns (uint256);

    /**
     * @dev Get the group of requests.
     * @return Group of requests.
     */
    function getGroupedRequests(uint256 groupID) external view returns (RequestInfo[] memory);

    /**
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return Whether the request ID exists
     */
    function requestIdExists(uint256 requestId) external view returns (bool);

    /**
     * @dev Checks if a group ID exists
     * @param groupId The ID of the group
     * @return Whether the group ID exists
     */
    function groupIdExists(uint256 groupId) external view returns (bool);

    /**
     * @dev Checks if a multiRequest ID exists
     * @param multiRequestId The ID of the multiRequest
     * @return Whether the multiRequest ID exists
     */
    function multiRequestIdExists(uint256 multiRequestId) external view returns (bool);

    /**
     * @dev Gets the status of the multiRequest verification
     * @param multiRequestId The ID of the MultiRequest
     * @param userAddress The address of the user
     * @return status The status of the MultiRequest. "True" if all requests are verified, "false" otherwise
     */
    function getMultiRequestProofsStatus(
        uint256 multiRequestId,
        address userAddress
    ) external view returns (RequestProofStatus[] memory);

    /**
     * @dev Checks if the proofs from a Multirequest submitted for a given sender and request ID are verified
     * @param multiRequestId The ID of the MultiRequest
     * @param userAddress The address of the user
     * @return Wether the multiRequest is verified.
     */
    function areMultiRequestProofsVerified(
        uint256 multiRequestId,
        address userAddress
    ) external view returns (bool);

    /**
     * @dev Gets proof storage response field value
     * @param requestId Id of the request
     * @param sender Address of the user
     * @param responseFieldName Name of the proof storage response field to get
     */
    function getResponseFieldValue(
        uint256 requestId,
        address sender,
        string memory responseFieldName
    ) external view returns (uint256);

    /**
     * @dev Gets proof storage response fields
     * @param requestId Id of the request
     * @param sender Address of the user
     */
    function getResponseFields(
        uint256 requestId,
        address sender
    ) external view returns (IRequestValidator.ResponseField[] memory);

    /**
     * @dev Checks if a proof from a request submitted for a given sender and request ID is verified
     * @param sender Sender of the proof.
     * @param requestId Request id of the Request to verify.
     * @return True if proof is verified for the sender and request id.
     */
    function isRequestProofVerified(address sender, uint256 requestId) external view returns (bool);

    /**
     * @dev Sets an auth method
     * @param authMethod The auth method to add
     */
    function setAuthMethod(AuthMethod calldata authMethod) external;

    /**
     * @dev Sets a multiRequest
     * @param multiRequest The multiRequest data
     */
    function setMultiRequest(MultiRequest calldata multiRequest) external;

    /**
     * @dev Gets a specific multiRequest by ID
     * @param multiRequestId The ID of the multiRequest
     * @return multiRequest The multiRequest data
     */
    function getMultiRequest(
        uint256 multiRequestId
    ) external view returns (MultiRequest memory multiRequest);

    /**
     * @dev Get the proof status for the sender and request with requestId.
     * @param sender Sender of the proof.
     * @param requestId Request id of the proof.
     * @return Proof status.
     */
    function getRequestProofStatus(
        address sender,
        uint256 requestId
    ) external view returns (RequestProofStatus memory);
}
