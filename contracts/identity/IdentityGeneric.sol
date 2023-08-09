// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "OnChainIdentity.sol";

contract IdentityGeneric {
    using IdentityLib for IdentityLib.Data;

    mapping (uint256 => IdentityLib.Data) internal identities;

    function createIdentity() external {
        uint256 id = GenesisUtils.calcOnchainIdFromAddress(
            self.stateContract.getDefaultIdType(),
            msg.sender
        );

        identities[id].initialize(_stateContractAddress, msg.sender, 40, true);
    }

    function addClaimsTreeRoot(uint256 id, uint256 root) external {
        identities[id].addClaimsTreeRoot(root);
    }

    function revokeClaim(uint256 id, uint64 revocationNonce) external {
        identities[id].revokeClaim(revocationNonce);
    }

    function transitState(uint256 id) external {
        identities[id].transitState();
    }

    //TODO: add more functions
}
