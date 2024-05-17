// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

contract RequestDisable is ZKPVerifierBase {
    /// @custom:storage-location erc7201:iden3.storage.RequestDisable
    struct RequestDisableStorage {
        mapping(uint64 requestID => bool isDisabled) _requestDisabling;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestDisable")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RequestDisableStorageLocation =
        0xd3b813ca1545297f983e6a57a9996f864572183cb0b19e5e1bde10e5f6c4fb00;

    function _getRequestDisableStorage() private pure returns (RequestDisableStorage storage $) {
        assembly {
            $.slot := RequestDisableStorageLocation
        }
    }

    /// @dev Modifier to check if the ZKP request is enabled
    modifier requestEnabled(uint64 requestId) {
        require(isZKPRequestEnabled(requestId), "Request is disabled");
        _;
    }

    /// @dev Submits a ZKP response and updates proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The input data for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public virtual override requestEnabled(requestId) {
        super.submitZKPResponse(requestId, inputs, a, b, c);
    }

    /// @dev Verifies a ZKP response without updating any proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The public inputs for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    /// @param sender The sender on behalf of which the proof is done
    function verifyZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        address sender
    )
        public
        view
        virtual
        override
        requestEnabled(requestId)
        returns (ICircuitValidator.KeyToInputIndex[] memory)
    {
        return super.verifyZKPResponse(requestId, inputs, a, b, c, sender);
    }

    /// @dev Checks if ZKP Request is enabled
    /// @param requestId The ID of the ZKP request
    /// @return True if ZKP Request enabled, otherwise returns false
    function isZKPRequestEnabled(
        uint64 requestId
    ) public view virtual checkRequestExistence(requestId, true) returns (bool) {
        return !_getRequestDisableStorage()._requestDisabling[requestId];
    }

    function _disableZKPRequest(uint64 requestId) internal checkRequestExistence(requestId, true) {
        _getRequestDisableStorage()._requestDisabling[requestId] = true;
    }

    function _enableZKPRequest(uint64 requestId) internal checkRequestExistence(requestId, true) {
        _getRequestDisableStorage()._requestDisabling[requestId] = false;
    }
}
