// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.27;

import {IAuthValidator} from "./IAuthValidator.sol";
import {IRequestValidator} from "./IRequestValidator.sol";

/**
 * @dev IVerifier. Interface for verification of groth16 proofs for validators circuits.
 */
interface IVerifier {
    /**
     * @dev Request. Structure for request.
     * @param requestId Request id.
     * @param metadata Metadata of the request.
     * @param validator Validator to verify the response.
     * @param params Parameters data of the request.
     */
    struct Request {
        uint256 requestId;
        string metadata;
        IRequestValidator validator;
        bytes params;
    }
    /**
     * @dev RequestInfo. Structure for request info.
     * @param requestId Request id.
     * @param metadata Metadata of the request.
     * @param validator Validator to verify the response.
     * @param params Parameters data of the request.
     * @param creator Creator of the request.
     * @param verifierId Verifier id.
     * @param isVerifierAuthenticated True if the verifier is authenticated.
     */
    struct RequestInfo {
        uint256 requestId;
        string metadata;
        IRequestValidator validator;
        bytes params;
        address creator;
        uint256 verifierId;
        bool isVerifierAuthenticated;
    }
    /**
     * @dev AuthProofStatus. Structure for auth proof status.
     * @param groupId Group id of the requests.
     * @param requests Requests of the group.
     */
    struct GroupedRequests {
        uint256 groupId;
        Request[] requests;
    }

    /**
     * @dev ProofStatus. Structure for proof status.
     * @param isVerified True if the proof is verified.
     * @param validatorVersion Version of the validator.
     * @param blockNumber Block number of the proof.
     * @param blockTimestamp Block timestamp of the proof.
     */
    struct ProofStatus {
        bool isVerified;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
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
     * @dev GroupedResponses. Structure for grouped responses.
     * @param groupId Group id of the responses.
     * @param responses Responses of the group.
     */
    struct GroupedResponses {
        uint256 groupId;
        Response[] responses;
    }
    /**
     * @dev AuthResponse. Structure for auth response.
     * @param authType Auth type of the proof response.
     * @param proof proof to verify.
     */
    struct AuthResponse {
        string authType; //zkp-auth-v2, zkp-auth-v3, etc. will deside later
        bytes proof;
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

    struct AuthType {
        string authType;
        IAuthValidator validator;
        bytes params;
    }

    /**
     * @dev AuthProofStatus. Structure for auth proof status.
     * @param authType Auth type of the auth proof.
     * @param isVerified True if the proof is verified.
     * @param validatorVersion Version of the validator.
     * @param timestamp Timestamp of the proof.
     */
    struct AuthProofStatus {
        string authType;
        bool isVerified;
        string validatorVersion;
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
    ) external;

    /**
     * @dev Sets different requests
     * @param singleRequests The requests that are not in any group
     * @param groupedRequests The requests that are in a group
     */
    function setRequests(
        Request[] calldata singleRequests,
        GroupedRequests[] calldata groupedRequests
    ) external;

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
     * @dev Checks if a request ID exists
     * @param requestId The ID of the request
     * @return Whether the request ID exists
     */
    function requestIdExists(uint256 requestId) external view returns (bool);

    /**
     * @dev Gets the status of the query verification
     * @param queryId The ID of the query
     * @param userAddress The address of the user
     * @return status The status of the query. "True" if all requests are verified, "false" otherwise
     */
    function getQueryStatus(
        uint256 queryId,
        address userAddress
    ) external view returns (AuthProofStatus[] memory, RequestProofStatus[] memory);

    /**
     * @dev Gets proof storage response field value
     * @param requestId Id of the request
     * @param userID Id of the user
     * @param responseFieldName Name of the proof storage response field to get
     */
    function getResponseFieldValue(
        uint256 requestId,
        uint256 userID,
        string memory responseFieldName
    ) external view returns (uint256);

    /**
     * @dev Get if proof is verified for the sender and request with requestId.
     * @param sender Sender of the proof.
     * @param requestId Request id of the Request to verify.
     * @return True if proof is verified for the sender and request id.
     */
    function isProofVerified(address sender, uint256 requestId) external view returns (bool);

    /**
     * @dev Sets an auth type
     * @param authType The auth type to add
     */
    function setAuthType(AuthType calldata authType) external;

    /**
     * @dev Sets a query
     * @param queryId The ID of the query
     * @param query The query data
     */
    function setQuery(uint256 queryId, Query calldata query) external;

    /**
     * @dev Gets a specific multi query by ID
     * @param queryId The ID of the multi query
     * @return query The query data
     */
    function getQuery(uint256 queryId) external view returns (IVerifier.Query memory query);
}
