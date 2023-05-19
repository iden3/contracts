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

   function getMaxSmtDepth() public pure override returns (uint256) {
        return 42;
    }

    function addClaim(uint256[8] memory claim) public override onlyOwner {
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

}
