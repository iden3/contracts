// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import {IState} from "../interfaces/IState.sol";
import {UniversalVerifier} from "../verifiers/UniversalVerifier.sol";

contract UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest is UniversalVerifier {
    function _checkCanWriteProofResults(
        uint256 /* requestId */,
        address /* caller */
    ) internal view override {
        // Allow all writes for testing purposes
    }
}
