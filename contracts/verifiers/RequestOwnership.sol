// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";

abstract contract RequestOwnership is ZKPVerifierBase {
    /// @custom:storage-location erc7201:iden3.storage.RequestOwnership
    struct RequestOwnershipStorage {
        mapping(uint64 requestId => address requestOwner) _requestOwners;
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

    /// @dev Modifier to check if the caller is ZKP Request owner
    modifier onlyRequestOwner(uint64 requestId) virtual {
        require(getRequestOwner(requestId) == _msgSender(), "Not a request owner");
        _;
    }

    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public virtual override {
        super.setZKPRequest(requestId, request);
        _setRequestOwner(requestId, _msgSender());
    }

    /**
     * @dev Set the list of ZKP requests for the list of requestIds in the same order.
     * @param requestIds Request ids of the ZKP requests.
     * @param requests ZKP requests to set.
     */
    function setZKPRequests(
        uint64[] calldata requestIds,
        ZKPRequest[] calldata requests
    ) public virtual override {
        for (uint256 i = 0; i < requestIds.length; i++) {
            setZKPRequest(requestIds[i], requests[i]);
        }
    }

    /// @dev Get a ZKP Request Owner address
    /// @param requestId The ID of a ZKP Request
    /// @return The ZKP Request Owner address
    function getRequestOwner(
        uint64 requestId
    ) public view virtual checkRequestExistence(requestId, true) returns (address) {
        return _getRequestOwnershipStorage()._requestOwners[requestId];
    }

    function _setRequestOwner(
        uint64 requestId,
        address requestOwner
    ) internal checkRequestExistence(requestId, true) {
        RequestOwnershipStorage storage $ = _getRequestOwnershipStorage();
        $._requestOwners[requestId] = requestOwner;
    }
}
