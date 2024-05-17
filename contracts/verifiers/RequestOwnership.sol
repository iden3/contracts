// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";

abstract contract RequestOwnership is ZKPVerifierBase {
    /// @custom:storage-location erc7201:iden3.storage.RequestOwnership.sol
    struct RequestOwnershipStorage {
        mapping(uint64 requestID => address requestOwner) _requestOwners;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestOwnership")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RequestOwnershipStorageLocation =
        0x6209bdc3799f5201408f7a7d4d471bb2a0100353e618451674b93f730b006a00;

    function _getRequestOwnershipStorage()
        private
        pure
        returns (RequestOwnershipStorage storage $)
    {
        assembly {
            $.slot := RequestOwnershipStorageLocation
        }
    }

    /// @dev Get controller for a ZKPRequest
    /// @param requestId The ID of a ZKP Request
    /// @return The controller address
    function getController(
        uint64 requestId
    ) public view virtual checkRequestExistence(requestId, true) returns (address) {
        return _getRequestOwnershipStorage()._requestOwners[requestId];
    }

    function _setController(
        uint64 requestId,
        address controller
    ) internal checkRequestExistence(requestId, true) {
        RequestOwnershipStorage storage $ = _getRequestOwnershipStorage();
        $._requestOwners[requestId] = controller;
    }
}
