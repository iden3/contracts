// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

abstract contract RequestAccessControl {
    /// @custom:storage-location iden3.storage.RequestAccessControl
    struct RequestAccessControlStorage {
        mapping(uint64 requestID => address controller) _requestAccessControls;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestAccessControl")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RequestAccessControlStorageLocation =
        0x3ff134a8a1134930ad5f0189cd37b9e1c429f5d0263f51283e6af06376c56100;

    function _getRequestAccessControlStorage()
        private
        pure
        returns (RequestAccessControlStorage storage $)
    {
        assembly {
            $.slot := RequestAccessControlStorageLocation
        }
    }

    function getController(uint64 requestID) public view virtual returns (address) {
        return _getRequestAccessControlStorage()._requestAccessControls[requestID];
    }

    function _setController(uint64 requestID, address controller) internal {
        RequestAccessControlStorage storage $ = _getRequestAccessControlStorage();
        $._requestAccessControls[requestID] = controller;
    }
}
