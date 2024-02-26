// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import {IUniversalVerifier} from "../interfaces/IUniversalVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

contract UniversalVerifierTestWrapper {
    IUniversalVerifier private verifier;

    constructor(IUniversalVerifier _verifier) public {
        verifier = _verifier;
    }

    function verifyZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        address sender
    ) external {
        ICircuitValidator.KeyToInputIndex[] memory pairs = verifier.verifyZKPResponse(
            requestId,
            inputs,
            a,
            b,
            c,
            sender
        );

        // user pairs in some way
        // ...

        //doAirDrop() or whatever is needed in the business logic
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external {
        verifier.submitZKPResponse(requestId, inputs, a, b, c);
    }
}
