// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Verifier} from "./Verifier.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

abstract contract RequestOwnership is Verifier {
    /// @custom:storage-location erc7201:iden3.storage.RequestOwnership
    struct RequestOwnershipStorage {
        mapping(uint256 requestId => address requestOwner) _requestOwners;
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

    /**
     * @dev Sets different requests
     * @param singleRequests The requests that are not in any group
     * @param groupedRequests The requests that are in a group
     */
    function setRequests(
        IVerifier.Request[] calldata singleRequests,
        IVerifier.GroupedRequests[] calldata groupedRequests
    ) public virtual override {
        super.setRequests(singleRequests, groupedRequests);
        for (uint256 i = 0; i < singleRequests.length; i++) {
            _setRequestOwner(singleRequests[i].requestId, _msgSender());
        }

        for (uint256 i = 0; i < groupedRequests.length; i++) {
            for (uint256 j = 0; j < groupedRequests[i].requests.length; j++) {
                _setRequestOwner(groupedRequests[i].requests[j].requestId, _msgSender());
            }
        }
    }

    /**
     * @dev Get a request owner address
     * @param requestId The ID of a request
     * @return The request owner address
     */
    function getRequestOwner(
        uint256 requestId
    ) public view virtual checkRequestExistence(requestId, true) returns (address) {
        return _getRequestOwnershipStorage()._requestOwners[requestId];
    }

    function _setRequestOwner(
        uint256 requestId,
        address requestOwner
    ) internal checkRequestExistence(requestId, true) {
        RequestOwnershipStorage storage $ = _getRequestOwnershipStorage();
        $._requestOwners[requestId] = requestOwner;
    }
}
