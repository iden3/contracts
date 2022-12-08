// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "solidity-bytes-utils/contracts/BytesLib.sol";

library Claim {
    uint8 public constant subjectFlagSelf = 0;
    uint8 public constant subjectFlagOtherIdenIndex = 0x10;
    uint8 public constant subjectFlagOtherIdenValue = 0x11;

    // IDPositionNone means ID value not located in claim.
    uint8 public constant IDPositionNone = 0;
    // IDPositionIndex means ID value is in index slots.
    uint8 public constant IDPositionIndex = 1;
    // IDPositionValue means ID value is in value slots.
    uint8 public constant IDPositionValue = 2;


    uint8 public constant flagsByteIdx = 16;
    uint8 public constant flagExpirationBitIdx = 3;
    uint8 public constant flagUpdatableBitIdx = 4;


    struct ClaimBuilder {
        uint256 schemaHash;
        uint8 idPosition;
        bool updatable;
        bool expirable;
        uint64 revocationNonce;
    }

    /**
     * @dev Create claim builder
     * @param schemaHash - schema hash
     * @return ClaimBuilder
     */
    function create(uint256 schemaHash) public pure returns (ClaimBuilder memory) {
        ClaimBuilder memory claimBuilder;
        claimBuilder.schemaHash = schemaHash;
        return claimBuilder;
    }

}
