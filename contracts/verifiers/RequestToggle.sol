// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

contract RequestToggle {
    /// @custom:storage-location iden3.storage.RequestToggle
    struct RequestToggleStorage {
        mapping(uint64 requestID => bool isDisabled) _requestToggles;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestToggle")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RequestToggleStorageLocation =
        0x36ad23456542ff637ddc5244ce57b5d090f1851e9d15bf516a7bd14b3422bc00;

    function _getRequestToggleStorage() private pure returns (RequestToggleStorage storage $) {
        assembly {
            $.slot := RequestToggleStorageLocation
        }
    }

    function isRequestEnabled(uint64 requestID) public view virtual returns (bool) {
        return !_getRequestToggleStorage()._requestToggles[requestID];
    }

    function _disableZKPRequest(uint64 requestId) internal {
        _getRequestToggleStorage()._requestToggles[requestId] = true;
    }

    function _enableZKPRequest(uint64 requestId) internal {
        _getRequestToggleStorage()._requestToggles[requestId] = false;
    }
}
