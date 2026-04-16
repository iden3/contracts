// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {UniversalVerifier} from "../verifiers/UniversalVerifier.sol";

contract UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest is UniversalVerifier {
    /* solhint-disable no-empty-blocks */
    function _checkCanWriteProofResults(
        uint256 /* requestId */,
        address /* caller */
    ) internal view override {
        // Allow all writes for testing purposes
    }

    function _checkCanWriteProofByUserIdResults(
        uint256 /* requestId */,
        uint256 /* userId */
    ) internal view override {
        // Allow all writes for testing purposes
    }
    /* solhint-enable no-empty-blocks */
}
