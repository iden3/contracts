// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IState.sol";
import "../lib/ClaimBuilder.sol";
import "../lib/OnChainIdentity.sol";
import "../lib/IdentityBase.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
contract IdentityExample is IdentityBase {

    // This empty reserved space is put in place to allow future versions
    // of the State contract to inherit from other contracts without a risk of
    // breaking the storage layout. This is necessary because the parent contracts in the
    // future may introduce some storage variables, which are placed before the State
    // contract's storage variables.
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    // slither-disable-next-line shadowing-state
    // slither-disable-next-line unused-state
    uint256[500] private __gap;

    function getMaxSmtDepth() public pure override returns (uint256) {
        return 42;
    }

    function addClaim(uint256[8] calldata claim) public override onlyOwner {
        super.addClaim(claim);
        super.transitState();
    }

    function addClaimHash(uint256 hashIndex, uint256 hashValue) public override onlyOwner {
        super.addClaimHash(hashIndex, hashValue);
        super.transitState();
    }

    function revokeClaim(uint64 revocationNonce) public override onlyOwner {
        super.revokeClaim(revocationNonce);
        super.transitState();
    }

    function getIssuerId() public view returns(uint256) {
        return identity.identityId;
    }

}
