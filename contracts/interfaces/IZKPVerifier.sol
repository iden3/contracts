pragma solidity ^0.8.4;

import "./ICircuitValidator.sol";

interface IZKPVerifier {
    /**
     * @dev Zero-Knowledge Proof request struct
     * @param validator The validator contract address
     * @param params The params for the validator
     */
    struct ZKPRequest {
        ICircuitValidator validator;
        uint256[] params;
    }

    /**
     * @dev Calls associated Validator contract verify method (see below) with the ZK proof,
     *      public inputs and associated request params
     * @param requestId the request id
     * @param validator the validator contract address
     * @param params the params of the validator
     */
    function setZKPRequest(
        uint64 requestId,
        ICircuitValidator validator,
        uint256[] memory params
    ) external;

    /**
     * @dev Stores a ZKP validator address and its params (if any) to validate public inputs,
     *      associates it with specific requestId.
     * @param requestId the request id
     * @param inputs the public inputs of the circuit
     * @param a the a part of ZK proof
     * @param b the b part of ZK proof
     * @param c the c part of ZK proof
     */
    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external;

    /**
     * @dev Returns validator address and its params by the requestId
     * @param requestId the request id
     * @return ZKPRequest struct
     */
    function getZKPRequest(uint64 requestId) external returns (ZKPRequest memory);
}
