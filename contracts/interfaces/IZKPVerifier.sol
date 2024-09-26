// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.27;

import {ICircuitValidator} from "./ICircuitValidator.sol";

interface IZKPVerifier {
    struct ZKPRequest {
        string metadata;
        ICircuitValidator validator;
        bytes data;
    }

    struct ProofStatus {
        bool isVerified;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external;

    function setZKPRequest(uint64 requestId, ZKPRequest calldata request) external;

    function getZKPRequest(uint64 requestId) external view returns (ZKPRequest memory);

    function getZKPRequestsCount() external view returns (uint256);

    function requestIdExists(uint64 requestId) external view returns (bool);

    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) external view returns (ZKPRequest[] memory);

    function isProofVerified(address sender, uint64 requestId) external view returns (bool);

    function getProofStatus(
        address sender,
        uint64 requestId
    ) external view returns (ProofStatus memory);

    function getProofStorageField(
        address user,
        uint64 requestId,
        string memory key
    ) external view returns (uint256);
}
