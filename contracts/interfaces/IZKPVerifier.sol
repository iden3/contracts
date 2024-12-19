// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.27;

import {ICircuitValidator} from "./ICircuitValidator.sol";

/**
 * @dev IZKPVerifier. Interface for verification of groth16 proofs for validators circuits.
 */
interface IZKPVerifier {
    /**
     * @dev ZKPRequest. Structure for ZKP request.
     * @param metadata Metadata of the request.
     * @param validator Validator circuit.
     * @param data Data of the request.
     */
    struct ZKPRequest {
        string metadata;
        ICircuitValidator validator;
        bytes data;
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
     * @dev ZKPResponse. Structure for ZKP response.
     * @param requestId Request id of the ZKP request.
     * @param zkProof ZKP proof to verify.
     * @param data Metadata of the request.
     */
    struct ZKPResponse {
        uint64 requestId;
        bytes zkProof;
        bytes data;
    }

    /**
     * @dev Submit the groth16 proof π=([πa]1,[πb]2,[πc]1) for the ZKP request requestId.
     * @param requestId Request id of the ZKP request.
     * @param inputs Public inputs of the circuit.
     * @param a πa element of the groth16 proof.
     * @param b πb element of the groth16 proof.
     * @param c πc element of the groth16 proof.
     */
    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external;

    /**
     * @dev Submit the groth16 proof π=([πa]1,[πb]2,[πc]1) for the ZKP request requestId.
     * @param responses The list of responses including ZKP request ID, ZK proof and metadata.
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle).
     */
    function submitZKPResponseV2(
        ZKPResponse[] memory responses,
        bytes memory crossChainProofs
    ) external;

    /**
     * @dev Set the ZKP request for the requestId.
     * @param requestId Request id of the ZKP request.
     * @param request ZKP request to set.
     */
    function setZKPRequest(uint64 requestId, ZKPRequest calldata request) external;

    /**
     * @dev Get the ZKP request for the requestId.
     * @param requestId Request id of the ZKP request.
     * @return ZKP request.
     */
    function getZKPRequest(uint64 requestId) external view returns (ZKPRequest memory);

    /**
     * @dev Get the ZKP request count.
     * @return ZKP request count.
     */
    function getZKPRequestsCount() external view returns (uint256);

    /**
     * @dev Check if the requestId exists.
     * @param requestId Request id of the ZKP request.
     * @return True if the requestId exists.
     */
    function requestIdExists(uint64 requestId) external view returns (bool);

    /**
     * @dev Get the ZKP requests.
     * @param startIndex Start index of the ZKP requests.
     * @param length Length of the ZKP requests.
     * @return Array of the ZKP requests.
     */
    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) external view returns (ZKPRequest[] memory);

    /**
     * @dev Get if proof is verified for the sender and ZKP request with requestId.
     * @param sender Sender of the proof.
     * @param requestId Request id of the ZKP Request to verify.
     * @return True if proof is verified for the sender and request id.
     */
    function isProofVerified(address sender, uint64 requestId) external view returns (bool);

    /**
     * @dev Get the proof status for the sender and ZKP request with requestId.
     * @param sender Sender of the proof.
     * @param requestId Request id of the proof.
     * @return Proof status.
     */
    function getProofStatus(
        address sender,
        uint64 requestId
    ) external view returns (ProofStatus memory);

    /**
     * @dev Get the proof storage field for the user, requestId and key.
     * @param user User address.
     * @param requestId Request id of the proof.
     * @param key Key of the proof storage field.
     * @return Proof storage field.
     */
    function getProofStorageField(
        address user,
        uint64 requestId,
        string memory key
    ) external view returns (uint256);
}
