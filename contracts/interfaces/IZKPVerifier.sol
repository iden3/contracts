// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.16;

import {ICircuitValidator} from "./ICircuitValidator.sol";

interface IZKPVerifier {
    struct ZKPRequest {
        string circuitId;
        string metadata;
        ICircuitValidator validator;
        bytes queryData;
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external returns (bool);

    function setZKPRequest(
        uint64 requestId,
        string calldata metadata,
        ICircuitValidator validator,
        bytes calldata queryData
    ) external returns (bool);

    function getZKPRequest(uint64 requestId) external view returns (ZKPRequest memory);

    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) external view returns (ZKPRequest[] memory);
}
