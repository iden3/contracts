// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {Verifier} from "./Verifier.sol";

error RequestIsDisabled(uint256 requestId);

contract RequestDisableable is Verifier {
    /// @custom:storage-location erc7201:iden3.storage.RequestDisableable
    struct RequestDisableStorage {
        mapping(uint256 requestId => bool isDisabled) _requestDisabling;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestDisableable")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RequestDisableStorageLocation =
        0x70325635d67d74932012fa921ccb2f335d3b1d69e3a487f50d001cc65f531600;

    function _getRequestDisableStorage() private pure returns (RequestDisableStorage storage $) {
        assembly {
            $.slot := RequestDisableStorageLocation
        }
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
        IVerifier.AuthResponse[] memory authResponses,
        IVerifier.Response[] memory singleResponses,
        IVerifier.GroupedResponses[] memory groupedResponses,
        bytes memory crossChainProofs
    ) public virtual override {
        for (uint256 i = 0; i < singleResponses.length; i++) {
            if (!isRequestEnabled(singleResponses[i].requestId)) {
                revert RequestIsDisabled(singleResponses[i].requestId);
            }
        }

        for (uint256 i = 0; i < groupedResponses.length; i++) {
            for (uint256 j = 0; j < groupedResponses[i].responses.length; j++) {
                if (!isRequestEnabled(groupedResponses[i].responses[j].requestId)) {
                    revert RequestIsDisabled(groupedResponses[i].responses[j].requestId);
                }
            }
        }
        super.submitResponse(authResponses, singleResponses, groupedResponses, crossChainProofs);
    }

    /**
     * @dev Checks if a request is enabled
     * @param requestId The ID of the request
     * @return True if the request enabled, otherwise returns false
     */
    function isRequestEnabled(
        uint256 requestId
    ) public view virtual checkRequestExistence(requestId, true) returns (bool) {
        return !_getRequestDisableStorage()._requestDisabling[requestId];
    }

    function _disableRequest(uint256 requestId) internal checkRequestExistence(requestId, true) {
        _getRequestDisableStorage()._requestDisabling[requestId] = true;
    }

    function _enableRequest(uint256 requestId) internal checkRequestExistence(requestId, true) {
        _getRequestDisableStorage()._requestDisabling[requestId] = false;
    }
}
