// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IUniversalVerifier } from '../interfaces/IUniversalVerifier.sol';

contract UniversalVerifierTestWrapper {
    IUniversalVerifier private verifier;

    constructor(IUniversalVerifier _verifier) public {
        verifier = _verifier;
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external {
        address sender = msg.sender;
        _callVerifyWithSender(requestId, inputs, a, b, c, sender);
    }

    function submitZKPResponseJustProxy(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external {
        verifier.submitZKPResponse(requestId, inputs, a, b, c);
    }

    function _callVerifyWithSender(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        address sender
    ) internal returns (bytes memory) {
        bytes4 selector = verifier.submitZKPResponse.selector;
        bytes memory data = abi.encodePacked(
            selector,
            abi.encode(requestId, inputs, a, b, c),
            sender
        );
        (bool success, bytes memory returnData) = address(verifier).call(data);

        if (!success) {
            if (returnData.length > 0) {
                // Extract revert reason from returnData
                assembly {
                let returnDataSize := mload(returnData)
                revert(add(32, returnData), returnDataSize)
            }
            } else {
                revert("Failed to verify proof without revert reason");
            }
        }
        return returnData;
    }
}
