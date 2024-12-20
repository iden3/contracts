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

    /// @dev Modifier to check if the request is enabled
    modifier onlyEnabledRequest(uint256 requestId) {
        if (!isRequestEnabled(requestId)) {
            revert RequestIsDisabled(requestId);
        }
        _;
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

    function _getRequestIfCanBeVerified(
        uint256 requestId
    )
        internal
        view
        virtual
        override
        onlyEnabledRequest(requestId)
        returns (IVerifier.RequestData storage)
    {
        return super._getRequestIfCanBeVerified(requestId);
    }
}
