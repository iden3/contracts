// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.16;

import {ICircuitValidator} from "./ICircuitValidator.sol";

interface IZKPVerifier {
    function submitZKPResponse(
        uint64 requestId,
        ICircuitValidator.ZKPResponse calldata zkpResponse
    ) external returns (bool);

    // function setZKPRequest(
    //     uint64 requestId,
    //     ICircuitValidator validator,
    //     uint256 schema,
    //     uint256 slotIndex,
    //     uint256 operator,
    //     uint256[] calldata value,
    //     string calldata metadata
    // ) external returns (bool);

    function setZKPRequestRaw(
        uint64 requestId,
        string calldata metadata,
        ICircuitValidator validator,
        bytes calldata queryData
    ) external returns (bool);

    function getZKPRequest(
        uint64 requestId
    ) external returns (ICircuitValidator.CircuitQuery memory);
}
